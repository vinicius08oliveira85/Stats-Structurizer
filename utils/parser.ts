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
  
  // Detect "Standard" (Flattened headers like "Playing Time MP")
  const hasFlattenedHeaders = lines.some(l => l.includes('Playing Time MP') || l.includes('Performance Gls'));

  if (hasFlattenedHeaders) {
    return parseFlattenedStandardTable(text);
  }

  // 1. Complex Stats Table (Grouped Headers like FBref standard stats)
  if (hasSquad && hasSuperHeaders) {
    return parseComplexStatsTable(text);
  }

  // 2. League Table (Rk Squad...)
  if (text.includes('Rk') && text.includes('Home MP')) {
    return parseLeagueTable(text);
  }

  if (text.includes('Club Crest') || (hasRk && hasSquad)) {
    return parseLeagueTable(text);
  }

  // 3. Try the robust Row-Based Parser
  const rowBasedTables = parseRowBasedStats(text);
  if (rowBasedTables.length > 0) {
    return rowBasedTables;
  }

  // 4. Fallback to the existing "Flattened Stats" parser
  return parseTokenStreamTable(text);
};

/**
 * Parser for the "Standard" format seen in the image (already flattened headers).
 */
const parseFlattenedStandardTable = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let headers: string[] = [];
  let headerRowIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Squad') && (line.includes('Playing Time') || line.includes('Performance'))) {
      headers = line.split(/\t+/).filter(t => t.trim());
      if (headers.length < 5) headers = line.split(/\s{2,}/).filter(t => t.trim());
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) return [];

  const rows: DataRow[] = [];
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by tab or multiple spaces
    const tokens = line.split(/\t+/).length > 2 ? line.split(/\t+/) : line.split(/\s{2,}/);
    
    if (tokens.length >= 2) {
      rows.push({
        metric: tokens[0].trim(),
        values: tokens.slice(1).map(v => v.trim())
      });
    }
  }

  return [{
    id: crypto.randomUUID(),
    title: 'Standard Stats Table',
    firstColumnHeader: headers[0] || 'Squad',
    headers: headers.slice(1),
    rows: rows
  }];
};

/**
 * Parses tables with "Super Headers" (Grouped columns).
 */
const parseComplexStatsTable = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let headerIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Squad') || line.startsWith('Team')) {
      headerIndex = i;
      headers = line.split(/\t+/).filter(t => t.trim());
      if (headers.length < 3) {
        headers = line.split(/\s{2,}/).filter(t => t.trim());
      }
      if (headers.length < 3) {
        headers = line.split(/\s+/);
      }
      break;
    }
  }

  if (headerIndex === -1) return [];

  const rows: DataRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(/^([^\d]+)(.*)$/);
    if (match) {
      const name = match[1].trim();
      const statsStr = match[2].trim();
      const stats = statsStr.split(/\s+/);
      if (stats.length > 3) {
        rows.push({
          metric: name,
          values: stats
        });
      }
    }
  }

  const colGroups: ColumnGroup[] = [];
  if (headerIndex > 0) {
    const superLine = lines[headerIndex - 1];
    if (superLine.includes('Playing Time') && superLine.includes('Performance')) {
       const subHeaders = headers;
       let currentIdx = 1; 
       const ptStartIdx = subHeaders.findIndex((h, i) => i > 0 && ['# Pl', 'MP', 'Age'].includes(h));
       const ptEndIdx = subHeaders.findIndex((h, i) => i > ptStartIdx && h === '90s');
       if (ptStartIdx !== -1 && ptEndIdx !== -1) {
          colGroups.push({ title: 'Playing Time', colSpan: ptEndIdx - ptStartIdx + 1, offset: 1 });
          currentIdx = ptEndIdx + 1;
       }
       const perfStartIdx = currentIdx;
       const perfEndIdx = subHeaders.findIndex((h, i) => i > perfStartIdx && ['CrdR', 'CrdY'].includes(h));
       if (perfStartIdx < subHeaders.length && perfEndIdx !== -1) {
          colGroups.push({ title: 'Performance', colSpan: perfEndIdx - perfStartIdx + 1, offset: 0 });
          currentIdx = perfEndIdx + 1;
       }
       if (currentIdx < subHeaders.length) {
         colGroups.push({ title: 'Per 90 Minutes', colSpan: subHeaders.length - currentIdx, offset: 0 });
       }
    }
  }

  const maxRowCols = Math.max(...rows.map(r => r.values.length));
  if (headers.length < maxRowCols + 1) {
     const missing = (maxRowCols + 1) - headers.length;
     for(let k=0; k<missing; k++) headers.push('-');
  }

  return [{
    id: crypto.randomUUID(),
    title: 'Team Stats Overview',
    firstColumnHeader: 'Squad',
    headers: headers.slice(1),
    rows: rows,
    columnGroups: colGroups.length > 0 ? colGroups : undefined
  }];
};

const parseRowBasedStats = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const tables: ParsedTable[] = [];
  const knownHeaderSets = [
    ['Casa', 'Fora', 'Global'],
    ['Casa', 'Global'],
    ['Home', 'Away', 'Global'],
    ['Home', 'Away', 'Total'],
    ['Home', 'Total'],
    ['C', 'F', 'G']
  ];

  let currentTable: Partial<ParsedTable> | null = null;
  let pendingTitle: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^(Lê mais em|Read more at)/i)) continue;
    const tokens = line.split(/\s+/);
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
      if (currentTable) tables.push(currentTable as ParsedTable);
      currentTable = { id: crypto.randomUUID(), title: pendingTitle || 'Stats Table', headers: matchedHeaders, rows: [], firstColumnHeader: '' };
      pendingTitle = null;
      continue;
    }

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
        currentTable.rows!.push({ metric: remainder, values: values });
        pendingTitle = null;
        continue;
      }
    }
    pendingTitle = line;
  }
  if (currentTable) tables.push(currentTable as ParsedTable);
  return tables;
};

const parseLeagueTable = (text: string): ParsedTable[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const rows: DataRow[] = [];
  let headers: string[] = [];
  let firstColumnHeader = 'Rk';

  for (let line of lines) {
    let cleanLine = line.replace(/Club Crest/gi, '').trim();
    
    // Header detection
    if (cleanLine.startsWith('Rk') && (cleanLine.includes('Squad') || cleanLine.includes('Home MP'))) {
      // Prioritize tabs for accurate multi-word header splitting
      if (cleanLine.includes('\t')) {
        const tokens = cleanLine.split('\t');
        firstColumnHeader = tokens[0];
        headers = tokens.slice(1);
      } else {
        // Fallback: smart split for known sports headers
        const rawTokens = cleanLine.split(/\s+/);
        const processedHeaders: string[] = [];
        for (let i = 0; i < rawTokens.length; i++) {
          const current = rawTokens[i];
          const next = rawTokens[i + 1];
          // Join "Home" or "Away" with the next token if it's a known suffix
          if ((current === 'Home' || current === 'Away') && next && (['MP', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts', 'Pts/MP'].includes(next))) {
            processedHeaders.push(`${current} ${next}`);
            i++;
          } else {
            processedHeaders.push(current);
          }
        }
        firstColumnHeader = processedHeaders[0];
        headers = processedHeaders.slice(1);
      }
      continue;
    }

    // Row detection
    const tokens = cleanLine.split(/\t/).length > 3 ? cleanLine.split(/\t/) : cleanLine.split(/\s+/);
    if (tokens.length < 3) continue;

    const rank = tokens[0];
    if (!/^\d+$/.test(rank)) continue;

    let statsStartIndex = -1;
    // Find the first numeric-only token after the rank
    for (let i = 1; i < tokens.length; i++) {
      if (/^[-+]?[\d.,]+$/.test(tokens[i])) {
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

  return [{
    id: crypto.randomUUID(),
    title: 'League Table',
    firstColumnHeader: firstColumnHeader,
    headers: headers,
    rows: rows
  }];
};

const parseTokenStreamTable = (text: string): ParsedTable[] => {
  const cleanedText = text.replace(/(Lê mais em:|Read more at:|Lê mais em).*/is, '').trim();
  const tokens = cleanedText.split(/\s+/).filter(t => t.length > 0);
  const tables: ParsedTable[] = [];
  const headerSets = [['Casa', 'Fora', 'Global'], ['Home', 'Away', 'Total']];
  const valuePattern = /^([-+]?[\d.,]+%?|-)$/;

  let currentTitleTokens: string[] = [];
  let currentHeaders: string[] = [];
  let currentRows: DataRow[] = [];
  let currentMetricTokens: string[] = [];
  let numColumns = 0;
  let i = 0;
  while (i < tokens.length) {
    let detectedHeaders: string[] | null = null;
    for (const hSet of headerSets) {
      if (i + hSet.length <= tokens.length) {
        if (hSet.every((t, idx) => tokens[i + idx].toLowerCase() === t.toLowerCase())) {
          detectedHeaders = hSet;
          break;
        }
      }
    }

    if (detectedHeaders) {
      if (currentHeaders.length > 0) {
        tables.push({ id: crypto.randomUUID(), title: currentTitleTokens.join(' ') || 'Untitled Table', headers: currentHeaders, rows: [...currentRows], firstColumnHeader: '' });
        currentTitleTokens = [...currentMetricTokens];
      } else {
        currentTitleTokens = [...currentTitleTokens, ...currentMetricTokens];
      }
      currentHeaders = detectedHeaders;
      numColumns = detectedHeaders.length;
      currentRows = [];
      currentMetricTokens = [];
      i += numColumns;
      continue;
    }

    if (currentHeaders.length > 0 && i + numColumns <= tokens.length && tokens.slice(i, i + numColumns).every(t => valuePattern.test(t))) {
      const metricName = currentMetricTokens.join(' ');
      if (metricName) currentRows.push({ metric: metricName, values: tokens.slice(i, i + numColumns) });
      currentMetricTokens = [];
      i += numColumns;
      continue;
    }
    currentMetricTokens.push(tokens[i]);
    i++;
  }
  if (currentHeaders.length > 0) {
    tables.push({ id: crypto.randomUUID(), title: currentTitleTokens.join(' ') || 'Untitled Table', headers: currentHeaders, rows: [...currentRows], firstColumnHeader: '' });
  }
  return tables;
};