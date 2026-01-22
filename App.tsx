import React, { useState, useEffect } from 'react';
import { ParsedTable } from './types';
import { parseStatsText } from './utils/parser';
import ParsedTableView from './components/ParsedTableView';
import EmptyState from './components/EmptyState';
import { Eraser, Table2, Copy } from 'lucide-react';

const EXAMPLE_SIMPLE = ` 	Casa	Fora	Global
Média de gols marcados por jogo	1	2.33	1.67
Média de gols sofridos por jogo	1.33	0.33	0.83
Média de gols marcados+sofridos	2.33	2.66	2.5
Jogos sem sofrer	-	67%	33%
Jogos sem marcar gols	33%	-	-
Jogos com Mais de 2,5 Gols	67%	67%	67%
Jogos com menos de 2,5 Gols	33%	33%	33%
Casa Global
Abre marcador (qualquer altura)	1 em 3	33%
 ⇒ e está a vencer ao intervalo	1 em 1	100%
 ⇒ e vence no final	1 em 1	100%
Reviravoltas	0 em 2	0%
VfB Stuttgart
 	Casa	Fora	Global
Média de gols marcados por jogo	2.67	1.33	2
Média de gols sofridos por jogo	0.67	1	0.83
Média de gols marcados+sofridos	3.34	2.33	2.83
Jogos sem sofrer	33%	33%	33%
Jogos sem marcar gols	-	67%	33%
Jogos com Mais de 2,5 Gols	67%	33%	50%
Jogos com menos de 2,5 Gols	33%	67%	50%

Lê mais em: https://www.academiadasapostasbrasil.com/stats/match/europa/liga-europa/roma/stuttgart/oJqmnv41jmxNr`;

const EXAMPLE_LEAGUE = `Rk	Squad	Home MP	Home W	Home D	Home L	Home GF	Home GA	Home GD	Home Pts	Home Pts/MP	Away MP	Away W	Away D	Away L	Away GF	Away GA	Away GD	Away Pts	Away Pts/MP
1	Arsenal	11	9	2	0	26	5	+21	29	2.64	11	6	3	2	14	9	+5	21	1.91
2	Manchester City	11	8	2	1	27	8	+19	26	2.36	11	5	2	4	18	13	+5	17	1.55
3	Aston Villa	11	8	1	2	18	9	+9	25	2.27	11	5	3	3	15	16	-1	18	1.64
4	Liverpool	11	6	3	2	16	11	+5	21	1.91	11	4	3	4	17	18	-1	15	1.36
5	Manchester Utd	11	6	3	2	20	13	+7	21	1.91	11	3	5	3	18	19	-1	14	1.27
6	Chelsea	11	5	3	3	17	11	+6	18	1.64	11	4	4	3	19	13	+6	16	1.45
7	Brentford	11	7	3	1	23	10	+13	24	2.18	11	3	0	8	12	20	-8	9	0.82
8	Newcastle United	11	7	2	2	22	15	+7	23	2.09	11	2	4	5	10	12	-2	10	0.91
9	Sunderland	11	6	5	0	18	9	+9	23	2.09	11	2	4	5	5	14	-9	10	0.91
10	Everton	11	4	3	4	14	15	-1	15	1.36	11	5	2	4	10	10	0	17	1.55
11	Fulham	11	6	2	3	19	13	+6	20	1.82	11	3	2	6	11	18	-7	11	1.00
12	Brighton	11	5	5	1	19	12	+7	20	1.82	11	2	4	5	13	17	-4	10	0.91
13	Crystal Palace	11	2	6	3	10	12	-2	12	1.09	11	5	1	5	13	13	0	16	1.45
14	Tottenham Hotspur	11	2	3	6	13	14	-1	9	0.82	11	5	3	3	18	15	+3	18	1.64
15	Bournemouth	11	5	4	2	16	11	+5	19	1.73	11	1	5	5	19	30	-11	8	0.73
16	Leeds United	11	5	4	2	19	13	+6	19	1.73	11	1	3	7	11	24	-13	6	0.55
17	Nottingham Forest	11	3	2	6	12	17	-5	11	1.00	11	3	2	6	9	17	-8	11	1.00
18	West Ham United	11	2	1	8	13	25	-12	7	0.64	11	2	4	5	11	19	-8	10	0.91
19	Burnley	11	2	3	6	10	15	-5	9	0.82	11	1	2	8	13	27	-14	5	0.45
20	Wolves	11	1	2	8	10	23	-13	5	0.45	11	0	3	8	5	18	-13	3	0.27`;

const EXAMPLE_COMPLEX = `Playing Time	Performance	Per 90 Minutes
Squad	# Pl	Age	Poss	MP	Starts	Min	90s	Gls	Ast	G+A	G-PK	PK	PKatt	CrdY	CrdR	Gls	Ast	G+A	G-PK	G+A-PK
Arsenal	24	26.6	58.3	22	242	1,980	22.0	37	27	64	34	3	3	30	0	1.68	1.23	2.91	1.55	2.77
Aston Villa	26	28.4	53.5	22	242	1,980	22.0	32	24	56	32	0	0	33	1	1.45	1.09	2.55	1.45	2.55
Bournemouth	24	25.7	49.8	22	242	1,980	22.0	35	18	53	32	3	4	54	1	1.59	0.82	2.41	1.45	2.27
Brentford	23	25.7	46.6	22	242	1,980	22.0	34	21	55	29	5	7	43	0	1.55	0.95	2.50	1.32	2.27
Brighton	26	26.0	52.5	22	242	1,980	22.0	31	18	49	28	3	5	57	0	1.41	0.82	2.23	1.27	2.09
Burnley	25	27.8	40.9	22	242	1,980	22.0	22	16	38	20	2	2	36	2	1.00	0.73	1.73	0.91	1.64
Chelsea	25	24.7	57.3	22	242	1,980	22.0	36	25	61	33	3	3	52	5	1.64	1.14	2.77	1.50	2.64
Crystal Palace	25	26.8	42.9	22	242	1,980	22.0	22	12	34	18	4	4	41	0	1.00	0.55	1.55	0.82	1.36
Everton	20	28.0	42.8	22	242	1,980	22.0	23	19	42	22	1	1	42	3	1.05	0.86	1.91	1.00	1.86
Fulham	23	28.7	51.4	22	242	1,980	22.0	27	19	46	26	1	1	50	0	1.23	0.86	2.09	1.18	2.05
Leeds United	23	27.0	45.6	22	242	1,980	22.0	30	14	44	27	3	4	32	0	1.36	0.64	2.00	1.23	1.86
Liverpool	23	27.0	61.7	22	242	1,980	22.0	32	22	54	31	1	2	37	0	1.45	1.00	2.45	1.41	2.41
Manchester City	26	25.8	59.4	22	242	1,980	22.0	42	33	75	40	2	3	38	0	1.91	1.50	3.41	1.82	3.32
Manchester Utd	26	26.3	53.2	22	242	1,980	22.0	36	25	61	34	2	4	31	1	1.64	1.14	2.77	1.55	2.68
Newcastle United	24	27.4	53.3	22	242	1,980	22.0	32	17	49	28	4	4	32	2	1.45	0.77	2.23	1.27	2.05
Nottingham Forest	27	26.3	49.5	22	242	1,980	22.0	21	13	34	19	2	2	35	0	0.95	0.59	1.55	0.86	1.45
Sunderland	26	26.0	43.3	22	242	1,980	22.0	21	15	36	19	2	3	44	2	0.95	0.68	1.64	0.86	1.55
Tottenham Hotspur	25	25.9	51.8	22	242	1,980	22.0	30	24	54	30	0	0	60	2	1.36	1.09	2.45	1.36	2.45
West Ham United	30	27.0	43.1	22	242	1,980	22.0	22	12	34	20	2	2	38	2	1.00	0.55	1.55	0.91	1.45
Wolves	26	26.7	44.4	22	242	1,980	22.0	14	9	23	12	2	3	46	2	0.64	0.41	1.05	0.55	0.95`;

const EXAMPLE_STANDARD = `Squad	Pl	Age	Poss	Playing Time MP	Playing Time Starts	Playing Time Min	Playing Time 90s	Performance Gls	Performance Ast	Performance G+A	Performance G-PK	Performance PK	Performance PKatt	Performance CrdY	Performance CrdR	Per 90 Minutes Gls	Per 90 Minutes Ast	Per 90 Minutes G+A	Per 90 Minutes G-PK	Per 90 Minutes G+A-PK
Augsburg	25	26.2	45.9	18	198	1,620	18.0	20	11	31	19	1	1	50	1	1.11	0.61	1.72	1.06	1.67
Bayern Munich	27	28.4	67.7	18	198	1,620	18.0	68	55	123	62	6	6	33	0	3.78	3.06	6.83	3.44	6.50
Dortmund	23	27.1	53.2	18	198	1,620	18.0	35	26	61	33	2	3	33	2	1.94	1.44	3.39	1.83	3.28
Eintracht Frankfurt	27	25.6	52.7	18	198	1,620	18.0	38	29	67	35	3	3	32	0	2.11	1.61	3.72	1.94	3.56
Freiburg	24	27.6	51.2	18	198	1,620	18.0	27	13	40	22	5	5	31	2	1.50	0.72	2.22	1.22	1.94
Gladbach	26	26.6	45.7	18	198	1,620	18.0	21	16	37	18	3	5	23	1	1.17	0.89	2.06	1.00	1.89
Hamburger SV	27	26.5	46.9	17	187	1,530	17.0	17	13	30	17	0	2	40	6	1.00	0.76	1.76	1.00	1.76
Heidenheim	26	27.4	42.9	18	198	1,620	18.0	17	12	29	17	0	0	31	1	0.94	0.67	1.61	0.94	1.61
Hoffenheim	23	27.1	53.6	17	187	1,530	17.0	33	25	58	30	3	3	32	0	1.94	1.47	3.41	1.76	3.24
Köln	25	25.8	47.6	18	198	1,620	18.0	27	18	45	26	1	1	31	1	1.50	1.00	2.50	1.44	2.44
Leverkusen	27	26.7	59.6	17	187	1,530	17.0	34	22	56	30	4	4	41	2	2.00	1.29	3.29	1.76	3.06
Mainz 05	28	28.7	45.1	18	198	1,620	18.0	18	12	30	15	3	3	42	5	1.00	0.67	1.67	0.83	1.50
RB Leipzig	26	25.9	50.6	17	187	1,530	17.0	32	24	56	31	1	2	25	0	1.88	1.41	3.29	1.82	3.24
St Pauli	21	27.7	46.4	17	187	1,530	17.0	16	12	28	15	1	2	29	1	0.94	0.71	1.65	0.88	1.59
Stuttgart	26	25.8	56.8	18	198	1,620	18.0	33	27	60	30	3	4	34	1	1.83	1.50	3.33	1.67	3.17
Union Berlin	22	27.7	38.7	18	198	1,620	18.0	24	15	39	24	0	2	40	2	1.33	0.83	2.17	1.33	2.17
Werder Bremen	25	25.5	49.2	17	187	1,530	17.0	21	16	37	19	2	3	44	3	1.24	0.94	2.18	1.12	2.06
Wolfsburg	27	26.0	47.3	18	198	1,620	18.0	27	22	49	25	2	2	35	1	1.50	1.22	2.72	1.39	2.61`;

function App() {
  const [inputText, setInputText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedTable[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'json'>('table');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputText.trim()) {
        const results = parseStatsText(inputText);
        setParsedData(results);
      } else {
        setParsedData([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputText]);

  const handleClear = () => {
    setInputText('');
    setParsedData([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Table2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Stats<span className="text-blue-600">Structurizer</span></h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 tracking-wider uppercase">
            <span className="hidden sm:inline bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Motor Determinístico v2.3</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-10rem)] min-h-[600px]">
          
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <label htmlFor="input-stats" className="font-bold text-gray-700 flex items-center gap-2">
                Dados de Entrada
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Raw Data</span>
              </label>
              <div className="flex gap-2">
                 <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                    <button onClick={() => setInputText(EXAMPLE_SIMPLE)} className="text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-all uppercase tracking-tight">Stats</button>
                    <div className="w-px bg-gray-200 my-1 mx-0.5"></div>
                    <button onClick={() => setInputText(EXAMPLE_LEAGUE)} className="text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-all uppercase tracking-tight">League</button>
                    <div className="w-px bg-gray-200 my-1 mx-0.5"></div>
                    <button onClick={() => setInputText(EXAMPLE_STANDARD)} className="text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-all uppercase tracking-tight">Standard</button>
                    <div className="w-px bg-gray-200 my-1 mx-0.5"></div>
                    <button onClick={() => setInputText(EXAMPLE_COMPLEX)} className="text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-all uppercase tracking-tight">Complex</button>
                 </div>
                <button onClick={handleClear} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Limpar"><Eraser className="w-4 h-4" /></button>
              </div>
            </div>
            <textarea
              id="input-stats"
              className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-600 placeholder:text-gray-300"
              placeholder="Cole estatísticas de times, tabelas de liga ou dados de desempenho aqui..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              spellCheck={false}
            />
             <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] font-bold text-gray-400 flex justify-between items-center uppercase tracking-widest">
                <div className="flex gap-4">
                  <span>Chars: {inputText.length}</span>
                  <span>Lines: {inputText.split('\n').filter(l => l.trim()).length}</span>
                </div>
                <div className="flex items-center gap-1">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                   Live Parser
                </div>
             </div>
          </div>

          <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                 <h2 className="font-bold text-gray-700">Resultado</h2>
                 <div className="flex bg-gray-200/50 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('table')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-tighter ${activeTab === 'table' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>Tabela</button>
                    <button onClick={() => setActiveTab('json')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-tighter ${activeTab === 'json' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>JSON</button>
                 </div>
              </div>
              {parsedData.length > 0 && (
                <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 uppercase tracking-tighter">
                  {parsedData.length} Tabela{parsedData.length !== 1 && 's'} Detectada{parsedData.length !== 1 && 's'}
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/20 relative">
              {parsedData.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-12">
                  {activeTab === 'table' ? (
                     parsedData.map((table) => (
                      <ParsedTableView key={table.id} table={table} />
                    ))
                  ) : (
                    <div className="relative group">
                      <pre className="bg-gray-900 text-blue-200 p-6 rounded-2xl text-[11px] font-mono overflow-x-auto shadow-2xl border border-gray-800 leading-relaxed">
                        {JSON.stringify(parsedData, null, 2)}
                      </pre>
                      <button onClick={() => navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2))} className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-xl hover:bg-white/20 transition-all"><Copy className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;