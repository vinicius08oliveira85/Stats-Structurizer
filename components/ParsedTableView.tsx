import React from 'react';
import { ParsedTable } from '../types';
import { Copy, Check, FileSpreadsheet } from 'lucide-react';

interface ParsedTableViewProps {
  table: ParsedTable;
}

const ParsedTableView: React.FC<ParsedTableViewProps> = ({ table }) => {
  const [copiedJson, setCopiedJson] = React.useState(false);
  const [copiedExcel, setCopiedExcel] = React.useState(false);

  const isTeamColumn = (header: string) => {
    const h = header.toLowerCase().trim();
    return ['squad', 'team', 'club', 'equipa', 'time', 'clube', 'seleção', 'player', 'jogador', 'atleta', 'nome'].some(k => h === k || h.includes(k));
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(table, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyExcel = () => {
    const metricHeader = table.firstColumnHeader ?? 'Metric';
    const headerRow = [metricHeader, ...table.headers].join('\t');
    const bodyRows = table.rows.map(row => [row.metric, ...row.values].join('\t')).join('\n');
    
    // Removed table.title from textData
    const textData = `${headerRow}\n${bodyRows}`;
    
    let html = `<html><head><meta charset="utf-8"></head><body><table border="1" style="border-collapse: collapse;">`;
    
    // Removed the <thead> row that contained table.title
    html += `<thead>`;
    html += `<tr><th style="background-color: #f9fafb; font-weight: bold; padding: 5px;">${metricHeader}</th>`;
    table.headers.forEach(h => html += `<th style="background-color: #f9fafb; font-weight: bold; padding: 5px;">${h}</th>`);
    html += `</tr></thead><tbody>`;

    table.rows.forEach(row => {
       html += `<tr>`;
       html += `<td style="padding: 5px; white-space: nowrap;">${row.metric}</td>`;
       row.values.forEach((val) => {
          html += `<td style="padding: 5px; text-align: center;">${val}</td>`;
       });
       html += `</tr>`;
    });
    html += `</tbody></table></body></html>`;
    
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const textBlob = new Blob([textData], { type: 'text/plain' });
        const htmlBlob = new Blob([html], { type: 'text/html' });
        navigator.clipboard.write([new ClipboardItem({ 'text/plain': textBlob, 'text/html': htmlBlob })]);
    } else {
        navigator.clipboard.writeText(textData);
    }
    setCopiedExcel(true);
    setTimeout(() => setCopiedExcel(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all hover:shadow-md">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
        <div>
            <h3 className="text-lg font-bold text-gray-800">{table.title}</h3>
            <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-0.5 rounded">ID: {table.id.slice(0, 8)}</span>
        </div>
        <div className="flex gap-2">
            <button onClick={handleCopyExcel} className={`flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all border ${copiedExcel ? 'text-green-700 bg-green-50 border-green-200 shadow-sm' : 'text-green-600 bg-white border-green-200 hover:bg-green-50 hover:shadow-sm'}`}>
              {copiedExcel ? <Check className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              <span>{copiedExcel ? 'Copiado Excel' : 'Copiar Excel'}</span>
            </button>
            <button onClick={handleCopyJson} className={`flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all border ${copiedJson ? 'text-blue-700 bg-blue-50 border-blue-200 shadow-sm' : 'text-gray-600 bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'}`}>
              {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'Copiado JSON' : 'Copiar JSON'}</span>
            </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold text-gray-700 border-r border-gray-100 bg-gray-50/30">
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
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap border-r border-gray-50 bg-gray-50/5">
                   {row.metric}
                </td>
                {row.values.map((val, valIdx) => {
                  const header = table.headers[valIdx] || '';
                  return (
                    <td key={valIdx} className={`px-6 py-4 font-mono text-gray-600 border-r border-dashed border-gray-100 last:border-0 ${isTeamColumn(header) ? 'text-left font-sans font-medium text-gray-800' : 'text-center'}`}>
                      <span className={`${val === '-' ? 'text-gray-300' : ''}`}>{val}</span>
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

export default ParsedTableView;