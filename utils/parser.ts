import { ParsedTable, DataRow, ColumnGroup } from '../types';

/**
 * Parses raw text copied from sports stats websites into structured data.
 * This function does NOT use AI; it uses deterministic string manipulation and token stream analysis.
 */
export const parseStatsText = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // 0. Pre-check for known header signatures
  const hasSquad = lines.some(l => l.includes('Squad') || l.includes('Equipa'));
  const hasRk = lines.some(l => l.trim().startsWith('Rk') || l.trim().startsWith('#'));
  const hasSuperHeaders = lines.some(l => l.includes('Playing Time') || l.includes('Performance') || l.includes('Per 90 Minutes'));

  // 1. New: Complex Stats Table (Grouped Headers like FBref standard stats)
  if (hasSquad && hasSuperHeaders) {
    return parseComplexStatsTable(text);
  }

  // 2. League Table (Rk Squad...)
  // Heuristic: Check for "Club Crest" or typical header starts like "Rk Squad"
  if (text.includes('Club Crest') || (hasRk && hasSquad)) {
    return parseLeagueTable(text);
  }

  // 3. Try the robust Row-Based Parser (Handles multi-table, titles, "1 em 3" values)
  const rowBasedTables = parseRowBasedStats(text);
  if (rowBasedTables.length > 0) {
    return rowBasedTables;
  }

  // 4. Fallback to the existing "Flattened Stats" parser
  return parseTokenStreamTable(text);
};

/**
 * Parses tables with "Super Headers" (Grouped columns).
 * Example:
 * Playing Time      Performance
 * Squad   MP   Min  Gls  Ast
 * Arsenal 20   1800 30   20
 */
const parseComplexStatsTable = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let headerIndex = -1;
  let headers: string[] = [];
  
  // Find the main header row (starts with Squad/Team usually)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Squad') || line.startsWith('Team')) {
      headerIndex = i;
      headers = line.split(/\t+| {2,}/).filter(t => t.trim());
      // If split failed (spaces only), try tokenizing
      if (headers.length < 3) {
        headers = line.split(/\s+/);
      }
      break;
    }
  }

  if (headerIndex === -1) return [];

  const rows: DataRow[] = [];
  const numberPattern = /^([-+]?[\d.,]+)$/;

  // Parse Data Rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Strategy: Team name is at start (can be multiple words), followed by numbers
    // Regex: Capture Group 1 (Name), Capture Group 2 (Rest of string)
    // We look for the first occurrence of a digit to split name vs stats
    const match = line.match(/^([^\d]+)(.*)$/);
    
    if (match) {
      const name = match[1].trim();
      const statsStr = match[2].trim();
      const stats = statsStr.split(/\s+/);
      
      // Basic validation: ensure we have roughly enough columns
      if (stats.length > 3) {
        rows.push({
          metric: name,
          values: stats
        });
      }
    }
  }

  // Parse Super Headers (Column Groups)
  const colGroups: ColumnGroup[] = [];
  if (headerIndex > 0) {
    const superLine = lines[headerIndex - 1];
    
    // Hardcoded heuristics for known standard layouts (Standard Stats)
    // Because parsing exact span from plain text without tabs is ambiguous
    if (superLine.includes('Playing Time') && superLine.includes('Performance')) {
       // Standard Layout Map
       // Col 0: Squad (Offset 1)
       // Playing Time: Usually MP, Starts, Min, 90s (# Pl, Age, Poss sometimes included)
       // Let's identify boundaries based on header names
       
       const subHeaders = headers; // e.g., ['Squad', '# Pl', 'Age', 'Poss', 'MP'...]
       
       // Define known groups for "Standard Stats"
       const groups = [
         { name: 'Playing Time', start: '# Pl', end: '90s' },
         { name: 'Performance', start: 'Gls', end: 'CrdR' }, // Note: Gls appears twice usually
         { name: 'Per 90 Minutes', start: 'Gls', end: null } // The second Gls
       ];

       let currentIdx = 1; // Start after Squad
       
       // Playing Time
       const ptStartIdx = subHeaders.findIndex((h, i) => i > 0 && ['# Pl', 'MP', 'Age'].includes(h));
       const ptEndIdx = subHeaders.findIndex((h, i) => i > ptStartIdx && h === '90s');
       
       if (ptStartIdx !== -1 && ptEndIdx !== -1) {
          colGroups.push({
             title: 'Playing Time',
             colSpan: ptEndIdx - ptStartIdx + 1,
             offset: 1 // Skips Squad
          });
          currentIdx = ptEndIdx + 1;
       }

       // Performance
       // Starts after Playing Time
       const perfStartIdx = currentIdx;
       // Finds the LAST column that looks like a raw stat before "Per 90" starts repeating headers
       // Usually 'CrdR' or 'CrdY' is the end of Performance
       const perfEndIdx = subHeaders.findIndex((h, i) => i > perfStartIdx && ['CrdR', 'CrdY'].includes(h));
       
       if (perfStartIdx < subHeaders.length && perfEndIdx !== -1) {
          colGroups.push({
            title: 'Performance',
            colSpan: perfEndIdx - perfStartIdx + 1,
            offset: 0 // Immediately follows previous
          });
          currentIdx = perfEndIdx + 1;
       }

       // Per 90 Minutes
       if (currentIdx < subHeaders.length) {
         colGroups.push({
           title: 'Per 90 Minutes',
           colSpan: subHeaders.length - currentIdx,
           offset: 0
         });
       }
    } else {
        // Fallback: Just take the line as tokens if it's not the known layout
        // This is tricky without knowing alignment.
        // For now, only return columnGroups if we matched the known layout pattern above
        // or simplistic tab split.
        const tokens = superLine.split(/\t{2,}/); // Try double tab
        if (tokens.length > 1 && tokens.length < headers.length) {
            // Very rough estimate
            const avgSpan = Math.floor((headers.length - 1) / tokens.length);
            tokens.forEach(t => {
                colGroups.push({ title: t.trim(), colSpan: avgSpan, offset: 0 });
            });
        }
    }
  }

  // Adjust headers: Ensure they align with rows. 
  // Often "Squad" is parsed but sometimes input text has fewer headers than data columns
  // or vice versa if spaces cause split issues.
  // We trust the Row parser (match regex) more than the Header split for column count.
  const maxRowCols = Math.max(...rows.map(r => r.values.length));
  // If headers are missing (e.g. spaces split incorrectly), fill them
  if (headers.length < maxRowCols + 1) { // +1 for Squad column
     const missing = (maxRowCols + 1) - headers.length;
     for(let k=0; k<missing; k++) headers.push('-');
  }

  return [{
    id: crypto.randomUUID(),
    title: 'Team Stats Overview',
    firstColumnHeader: 'Squad',
    headers: headers.slice(1), // Remove 'Squad' from headers list as it's the metric column
    rows: rows,
    columnGroups: colGroups.length > 0 ? colGroups : undefined
  }];
};

/**
 * New Parser: Handles multiple tables in one text block by processing line-by-line.
 * Detects headers, then parses rows by extracting values from the END of the line (Right-to-Left).
 * This supports metric names with spaces and numbers, and values with spaces like "1 em 3".
 */
const parseRowBasedStats = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const tables: ParsedTable[] = [];

  // Known header sets to detect start of a table
  const knownHeaderSets = [
    ['Casa', 'Fora', 'Global'],
    ['Casa', 'Global'], // New support
    ['Home', 'Away', 'Global'],
    ['Home', 'Away', 'Total'],
    ['Home', 'Total'],
    ['C', 'F', 'G']
  ];

  let currentTable: Partial<ParsedTable> | null = null;
  let pendingTitle: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip footer noise
    if (line.match(/^(Lê mais em|Read more at)/i)) continue;

    const tokens = line.split(/\s+/);
    
    // 1. Check if line is a Header
    let matchedHeaders: string[] | null = null;
    for (const hSet of knownHeaderSets) {
      if (tokens.length >= hSet.length) {
        const lastTokens = tokens.slice(-hSet.length);
        const isMatch = lastTokens.every((t, idx) => t.toLowerCase() === hSet[idx].toLowerCase());
        if (isMatch) {
          matchedHeaders = hSet;
          break;
        }
      }
    }

    if (matchedHeaders) {
      if (currentTable) {
        tables.push(currentTable as ParsedTable);
      }

      currentTable = {
        id: crypto.randomUUID(),
        title: pendingTitle || 'Stats Table',
        headers: matchedHeaders,
        rows: [],
        firstColumnHeader: ''
      };
      pendingTitle = null;
      continue;
    }

    // 2. Check if line is Data Row
    if (currentTable && currentTable.headers) {
      const numCols = currentTable.headers.length;
      const values: string[] = [];
      let remainder = line;
      let foundAllValues = true;

      for (let k = 0; k < numCols; k++) {
        const match = remainder.match(/(\s+)([-+]?[\d.,]+\s?%?|-|\d+\s+(?:em|of|de)\s+\d+)$/i);
        if (match) {
          values.unshift(match[2]);
          remainder = remainder.substring(0, match.index).trim();
        } else {
          foundAllValues = false;
          break;
        }
      }

      if (foundAllValues && values.length === numCols && remainder.length > 0) {
        currentTable.rows!.push({
          metric: remainder,
          values: values
        });
        pendingTitle = null;
        continue;
      }
    }

    pendingTitle = line;
  }

  if (currentTable) {
    tables.push(currentTable as ParsedTable);
  }

  return tables;
};

/**
 * Parser for League Table format (e.g. "1 Club Crest Arsenal 11 9 2...")
 */
const parseLeagueTable = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const rows: DataRow[] = [];
  let headers: string[] = [];
  let firstColumnHeader = 'Rk';

  const numberPattern = /^([-+]?[\d.,]+)$/;

  for (let line of lines) {
    let cleanLine = line.replace(/Club Crest/gi, '').trim();
    
    if (cleanLine.startsWith('Rk') && cleanLine.includes('Squad')) {
      const headerTokens = cleanLine.split(/\s+/);
      const squadIndex = headerTokens.findIndex(t => t === 'Squad');
      if (squadIndex !== -1) {
        firstColumnHeader = headerTokens[0];
        headers = headerTokens.slice(squadIndex);
      } else {
        headers = headerTokens.slice(2);
      }
      continue;
    }

    const tokens = cleanLine.split(/\s+/).filter(t => t);
    if (tokens.length < 3) continue;

    const rank = tokens[0];
    let statsStartIndex = -1;

    for (let i = 1; i < tokens.length; i++) {
      if (numberPattern.test(tokens[i])) {
        statsStartIndex = i;
        break;
      }
    }

    if (statsStartIndex !== -1) {
      const teamName = tokens.slice(1, statsStartIndex).join(' ');
      const values = tokens.slice(statsStartIndex);
      
      rows.push({
        metric: rank,
        values: [teamName, ...values]
      });
    }
  }

  if (rows.length > 0 && headers.length === 0) {
    const maxCols = Math.max(...rows.map(r => r.values.length));
    headers = Array.from({ length: maxCols }, (_, i) => `Col ${i + 1}`);
  }

  return [{
    id: crypto.randomUUID(),
    title: 'League Table',
    firstColumnHeader: firstColumnHeader,
    headers: headers,
    rows: rows
  }];
};

/**
 * Fallback Parser
 */
const parseTokenStreamTable = (text: string): ParsedTable[] => {
  const cleanedText = text.replace(/(Lê mais em:|Read more at:|Lê mais em).*/is, '').trim();
  const tokens = cleanedText.split(/\s+/).filter(t => t.length > 0);
  const tables: ParsedTable[] = [];

  const headerSets = [
    ['Casa', 'Fora', 'Global'],
    ['Home', 'Away', 'Total'],
    ['C', 'F', 'G'],
    ['C', 'F', 'T'],
    ['H', 'A', 'T']
  ];

  const valuePattern = /^([-+]?[\d.,]+%?|-)$/;

  let currentTitleTokens: string[] = [];
  let currentHeaders: string[] = [];
  let currentRows: DataRow[] = [];
  let currentMetricTokens: string[] = [];
  
  let numColumns = 0;
  let state = 0;

  const matchHeader = (startIndex: number) => {
    for (const hSet of headerSets) {
      if (startIndex + hSet.length <= tokens.length) {
        let match = true;
        for (let i = 0; i < hSet.length; i++) {
          if (tokens[startIndex + i].toLowerCase() !== hSet[i].toLowerCase()) {
            match = false;
            break;
          }
        }
        if (match) return hSet;
      }
    }
    return null;
  };

  const matchValues = (startIndex: number, count: number) => {
    if (startIndex + count > tokens.length) return false;
    for (let i = 0; i < count; i++) {
        if (!valuePattern.test(tokens[startIndex + i])) return false;
    }
    return true;
  };

  let i = 0;
  while (i < tokens.length) {
    const detectedHeaders = matchHeader(i);

    if (detectedHeaders) {
      if (currentHeaders.length > 0) {
        tables.push({
          id: crypto.randomUUID(),
          title: currentTitleTokens.join(' ') || 'Untitled Table',
          headers: currentHeaders,
          rows: [...currentRows],
          firstColumnHeader: ''
        });
        currentTitleTokens = [...currentMetricTokens];
      } else {
        currentTitleTokens = [...currentTitleTokens, ...currentMetricTokens];
      }

      currentHeaders = detectedHeaders;
      numColumns = detectedHeaders.length;
      currentRows = [];
      currentMetricTokens = [];
      state = 1;
      i += numColumns;
      continue;
    }

    if (state === 1) {
      if (matchValues(i, numColumns)) {
        const metricName = currentMetricTokens.join(' ');
        const values = tokens.slice(i, i + numColumns);

        if (metricName) {
           currentRows.push({
             metric: metricName,
             values: values
           });
        }
        currentMetricTokens = [];
        i += numColumns;
        continue;
      }
    }
    currentMetricTokens.push(tokens[i]);
    i++;
  }

  if (currentHeaders.length > 0) {
    tables.push({
      id: crypto.randomUUID(),
      title: currentTitleTokens.join(' ') || 'Untitled Table',
      headers: currentHeaders,
      rows: [...currentRows],
      firstColumnHeader: ''
    });
  }

  return tables;
};