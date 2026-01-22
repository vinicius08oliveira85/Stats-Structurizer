import React from 'react';
import { ParsedTable } from '../types';
import { Copy, Check, FileSpreadsheet, Shield } from 'lucide-react';

// Static mapping of known team names to public logo URLs
const TEAM_LOGOS: Record<string, string> = {
  // English Premier League / Championship
  'arsenal': 'https://crests.football-data.org/57.svg',
  'aston villa': 'https://crests.football-data.org/58.svg',
  'blackburn rovers': 'https://crests.football-data.org/59.svg',
  'bolton wanderers': 'https://crests.football-data.org/60.svg',
  'chelsea': 'https://crests.football-data.org/61.svg',
  'everton': 'https://crests.football-data.org/62.svg',
  'fulham': 'https://crests.football-data.org/63.svg',
  'liverpool': 'https://crests.football-data.org/64.svg',
  'manchester city': 'https://crests.football-data.org/65.svg',
  'man city': 'https://crests.football-data.org/65.svg',
  'manchester utd': 'https://crests.football-data.org/66.svg',
  'man utd': 'https://crests.football-data.org/66.svg',
  'manchester united': 'https://crests.football-data.org/66.svg',
  'newcastle united': 'https://crests.football-data.org/67.svg',
  'norwich city': 'https://crests.football-data.org/68.svg',
  'sunderland': 'https://crests.football-data.org/71.svg',
  'tottenham hotspur': 'https://crests.football-data.org/73.svg',
  'tottenham': 'https://crests.football-data.org/73.svg',
  'wolves': 'https://crests.football-data.org/76.svg',
  'wolverhampton wanderers': 'https://crests.football-data.org/76.svg',
  'burnley': 'https://crests.football-data.org/328.svg',
  'leicester city': 'https://crests.football-data.org/338.svg',
  'southampton': 'https://crests.football-data.org/340.svg',
  'leeds united': 'https://crests.football-data.org/341.svg',
  'watford': 'https://crests.football-data.org/346.svg',
  'nottingham forest': 'https://crests.football-data.org/351.svg',
  'crystal palace': 'https://crests.football-data.org/354.svg',
  'sheffield united': 'https://crests.football-data.org/356.svg',
  'luton town': 'https://crests.football-data.org/389.svg',
  'brighton': 'https://crests.football-data.org/397.svg',
  'brighton & hove albion': 'https://crests.football-data.org/397.svg',
  'brentford': 'https://crests.football-data.org/402.svg',
  'west ham united': 'https://crests.football-data.org/563.svg',
  'west ham': 'https://crests.football-data.org/563.svg',
  'bournemouth': 'https://crests.football-data.org/1044.svg',
  'afc bournemouth': 'https://crests.football-data.org/1044.svg',
  'ipswich town': 'https://crests.football-data.org/57.svg', // Fallback/Check ID

  // Spanish La Liga
  'athletic club': 'https://crests.football-data.org/77.svg',
  'atletico madrid': 'https://crests.football-data.org/78.svg',
  'osasuna': 'https://crests.football-data.org/79.svg',
  'espanyol': 'https://crests.football-data.org/80.svg',
  'barcelona': 'https://crests.football-data.org/81.svg',
  'getafe': 'https://crests.football-data.org/82.svg',
  'granada': 'https://crests.football-data.org/83.svg',
  'malaga': 'https://crests.football-data.org/84.svg',
  'real madrid': 'https://crests.football-data.org/86.svg',
  'rayo vallecano': 'https://crests.football-data.org/87.svg',
  'levante': 'https://crests.football-data.org/88.svg',
  'real mallorca': 'https://crests.football-data.org/89.svg',
  'mallorca': 'https://crests.football-data.org/89.svg',
  'real betis': 'https://crests.football-data.org/90.svg',
  'real sociedad': 'https://crests.football-data.org/92.svg',
  'villarreal': 'https://crests.football-data.org/94.svg',
  'valencia': 'https://crests.football-data.org/95.svg',
  'alaves': 'https://crests.football-data.org/263.svg',
  'cadiz': 'https://crests.football-data.org/264.svg',
  'real oviedo': 'https://crests.football-data.org/265.svg',
  'oviedo': 'https://crests.football-data.org/265.svg',
  'girona': 'https://crests.football-data.org/298.svg',
  'las palmas': 'https://crests.football-data.org/275.svg',
  'celta vigo': 'https://crests.football-data.org/558.svg',
  'elche': 'https://crests.football-data.org/285.svg',
  
  // Others
  'roma': 'https://crests.football-data.org/100.svg',
  'vfb stuttgart': 'https://crests.football-data.org/10.svg',
  'stuttgart': 'https://crests.football-data.org/10.svg',
};

const normalizeName = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
};

interface ParsedTableViewProps {
  table: ParsedTable;
}

const ParsedTableView: React.FC<ParsedTableViewProps> = ({ table }) => {
  const [copiedJson, setCopiedJson] = React.useState(false);
  const [copiedExcel, setCopiedExcel] = React.useState(false);

  const isTeamColumn = (header: string) => {
    const h = header.toLowerCase().trim();
    // Keywords to identify columns that likely contain team or player names
    return ['squad', 'team', 'club', 'equipa', 'time', 'clube', 'seleção', 'player', 'jogador', 'atleta', 'nome'].some(k => h === k || h.includes(k));
  };

  const getLogoUrl = (name: string) => {
    const isUrl = /^(https?:\/\/[^\s]+)$/i.test(name);
    if (isUrl) return name;
    const normalizedKey = normalizeName(name);
    return TEAM_LOGOS[normalizedKey];
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(table, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyExcel = () => {
    // 1. Text Format (Fallback)
    const metricHeader = table.firstColumnHeader ?? 'Metric';
    const headerRow = [metricHeader, ...table.headers].join('\t');
    const bodyRows = table.rows.map(row => {
      return [row.metric, ...row.values].join('\t');
    }).join('\n');
    const textData = `${table.title}\n${headerRow}\n${bodyRows}`;
    
    // 2. HTML Format (For Images in Excel)
    let html = `
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body>
        <table border="1" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th colspan="${table.headers.length + 1}" style="font-size: 14pt; font-weight: bold; text-align: left; background-color: #f3f4f6;">${table.title}</th>
            </tr>
    `;

    // Group Headers
    if (table.columnGroups && table.columnGroups.length > 0) {
       html += `<tr><th></th>`; // First col empty
       table.columnGroups.forEach(group => {
          if (group.offset && group.offset > 0) {
             html += `<th colspan="${group.offset}"></th>`;
          }
          html += `<th colspan="${group.colSpan}" style="background-color: #eff6ff; color: #1d4ed8; text-align: center; font-weight: bold;">${group.title}</th>`;
       });
       html += `</tr>`;
    }

    // Main Headers
    html += `<tr>`;
    html += `<th style="background-color: #f9fafb; font-weight: bold; border: 1px solid #d1d5db; padding: 5px;">${metricHeader}</th>`;
    table.headers.forEach(header => {
       html += `<th style="background-color: #f9fafb; font-weight: bold; border: 1px solid #d1d5db; padding: 5px; ${!isTeamColumn(header) ? 'text-align: center;' : 'text-align: left;'}">${header}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // Data Rows
    table.rows.forEach(row => {
       html += `<tr>`;
       
       // Metric Column
       const isFirstColTeam = table.firstColumnHeader && isTeamColumn(table.firstColumnHeader);
       let metricHtml = row.metric;
       if (isFirstColTeam) {
          const logo = getLogoUrl(row.metric);
          if (logo) {
             metricHtml = `<img src="${logo}" width="24" height="24" style="vertical-align: middle; margin-right: 8px;" alt="">${row.metric}`;
          }
       }
       html += `<td style="border: 1px solid #e5e7eb; padding: 5px; white-space: nowrap;">${metricHtml}</td>`;

       // Value Columns
       row.values.forEach((val, idx) => {
          const header = table.headers[idx] || '';
          let valHtml = val;
          if (isTeamColumn(header)) {
             const logo = getLogoUrl(val);
             if (logo) {
                valHtml = `<img src="${logo}" width="24" height="24" style="vertical-align: middle; margin-right: 8px;" alt="">${val}`;
             }
             html += `<td style="border: 1px solid #e5e7eb; padding: 5px; white-space: nowrap;">${valHtml}</td>`;
          } else {
             html += `<td style="border: 1px solid #e5e7eb; padding: 5px; text-align: center;">${valHtml}</td>`;
          }
       });
       html += `</tr>`;
    });

    html += `</tbody></table></body></html>`;
    
    // Execute Write
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const textBlob = new Blob([textData], { type: 'text/plain' });
        const htmlBlob = new Blob([html], { type: 'text/html' });
        
        navigator.clipboard.write([
            new ClipboardItem({
                'text/plain': textBlob,
                'text/html': htmlBlob
            })
        ]).then(() => {
            setCopiedExcel(true);
            setTimeout(() => setCopiedExcel(false), 2000);
        }).catch(err => {
            console.error("Clipboard write failed", err);
            // Fallback
            navigator.clipboard.writeText(textData);
            setCopiedExcel(true);
            setTimeout(() => setCopiedExcel(false), 2000);
        });
    } else {
         navigator.clipboard.writeText(textData);
         setCopiedExcel(true);
         setTimeout(() => setCopiedExcel(false), 2000);
    }
  };

  const hasGroups = table.columnGroups && table.columnGroups.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all hover:shadow-md">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
            <h3 className="text-lg font-bold text-gray-800">{table.title}</h3>
            <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-0.5 rounded">ID: {table.id.slice(0, 8)}</span>
        </div>
        <div className="flex gap-2">
            <button
              onClick={handleCopyExcel}
              className={`flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${
                copiedExcel 
                  ? 'text-green-700 bg-green-50 border-green-200' 
                  : 'text-green-600 hover:text-green-700 bg-white border-green-200 hover:bg-green-50'
              }`}
            >
              {copiedExcel ? <Check className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              <span>{copiedExcel ? 'Copied Excel' : 'Copy Excel'}</span>
            </button>
            <button
              onClick={handleCopyJson}
              className={`flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${
                 copiedJson
                  ? 'text-blue-700 bg-blue-50 border-blue-200'
                  : 'text-gray-600 hover:text-blue-600 bg-white border-gray-200 hover:border-blue-200'
              }`}
            >
              {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
            {/* Super Header Row (Grouped) */}
            {hasGroups && (
              <tr>
                 <th className="px-6 py-2 border-r border-gray-200 bg-gray-50"></th>
                 {table.columnGroups!.map((group, idx) => (
                   <React.Fragment key={idx}>
                      {/* Optional offset cells if groups don't start immediately */}
                      {group.offset && group.offset > 0 && <th colSpan={group.offset} className="px-1 bg-gray-50"></th>}
                      
                      <th 
                        colSpan={group.colSpan} 
                        className="px-6 py-2 text-center border-l border-r border-gray-200 font-bold tracking-wider text-blue-700 bg-blue-50/50"
                      >
                        {group.title}
                      </th>
                   </React.Fragment>
                 ))}
              </tr>
            )}

            {/* Main Header Row */}
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold text-gray-700 border-r border-gray-100">
                {table.firstColumnHeader ?? 'Metric'}
              </th>
              {table.headers.map((header, idx) => (
                <th key={idx} scope="col" className={`px-6 py-3 font-semibold text-blue-600 whitespace-nowrap border-r border-gray-100 last:border-0 ${isTeamColumn(header) ? 'text-left' : 'text-center'}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="bg-white border-b border-gray-50 hover:bg-blue-50/30 transition-colors last:border-b-0">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap border-r border-gray-50">
                   {/* Handle Team Cell Logic for the First Column if detected */}
                   {table.firstColumnHeader && isTeamColumn(table.firstColumnHeader) ? (
                      <TeamCellContent name={row.metric} />
                   ) : (
                      row.metric
                   )}
                </td>
                {row.values.map((val, valIdx) => {
                  const header = table.headers[valIdx] || '';
                  
                  if (isTeamColumn(header)) {
                    return <TeamCell key={valIdx} name={val} />;
                  }

                  return (
                    <td key={valIdx} className="px-6 py-4 text-center font-mono text-gray-600 border-r border-dashed border-gray-100 last:border-0">
                      <span className={`px-2 py-1 rounded ${val === '-' ? 'text-gray-300' : ''}`}>
                          {val}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TeamCellContent: React.FC<{ name: string }> = ({ name }) => {
  const isUrl = /^(https?:\/\/[^\s]+)$/i.test(name);
  
  // Check our dictionary for a match
  const normalizedKey = normalizeName(name);
  const logoFromMap = TEAM_LOGOS[normalizedKey];

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  const stringToTextColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 80%, 30%)`;
  };

  const getInitials = (n: string) => {
    return n
      .replace(/[^a-zA-Z0-9\u00C0-\u00FF\s]/g, '')
      .trim()
      .split(/\s+/)
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const bgColor = stringToColor(name);
  const textColor = stringToTextColor(name);
  const initials = getInitials(name);
  
  // Determine what to show in the circle
  let content;
  let hasImage = false;

  if (isUrl) {
    content = <img src={name} alt="Logo" className="w-full h-full object-cover" />;
    hasImage = true;
  } else if (logoFromMap) {
    content = <img src={logoFromMap} alt={name} className="w-full h-full object-contain p-1" />;
    hasImage = true;
  } else {
    content = (
      <span className="select-none">
        {initials ? initials : <Shield className="w-4 h-4 opacity-50" />}
      </span>
    );
  }

  return (
      <div className="flex items-center gap-3">
        <div 
           className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-black/5 overflow-hidden relative bg-white"
           style={!hasImage ? { backgroundColor: bgColor, color: textColor } : {}}
        >
          {content}
        </div>
        <span>{isUrl ? 'Image' : name}</span>
      </div>
  );
};

const TeamCell: React.FC<{ name: string }> = ({ name }) => {
  return (
    <td className="px-6 py-4 text-left font-medium text-gray-800 whitespace-nowrap">
      <TeamCellContent name={name} />
    </td>
  );
};

export default ParsedTableView;