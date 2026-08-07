import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { PeriodData } from '../types';
import { parsePtBrNumber } from './formatters';

export const DEFAULT_PERIODS: PeriodData[] = [
  {
    id: 'p1',
    data: '08/07 a 05/08',
    impressoes: 33333,
    alcance: 22222,
    click: 11111,
    contatos: 5773,
    orcamentos: 1376,
    vendas: 246,
    faturamento: 321415,
    lucroBruto: 110000,
    contatoParaOrcamento: 23.84,
    orcamentoParaVenda: 17.88,
    contatoParaVenda: 4.26,
    margemBruta: 34.22,
    ticketMedio: 1306.57,
    lucroBrutoMedio: 447.15,
  },
  {
    id: 'p2',
    data: '06/ago',
    impressoes: 33333,
    alcance: 22222,
    click: 11111,
    contatos: 1234,
    orcamentos: 1438,
    vendas: 254,
    faturamento: 328379,
    lucroBruto: 116922,
    contatoParaOrcamento: 116.53,
    orcamentoParaVenda: 17.66,
    contatoParaVenda: 20.58,
    margemBruta: 35.61,
    ticketMedio: 1292.83,
    lucroBrutoMedio: 460.32,
  },
];

/**
 * Parses raw matrix (2D array of strings/values) into PeriodData[]
 */
export function parseMatrixToPeriods(rows: any[][]): PeriodData[] {
  if (!rows || rows.length < 2) {
    throw new Error('O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
  }

  // Find header row (first non-empty row)
  const headerRowIndex = rows.findIndex((r) => r && r.length > 0 && r.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));
  if (headerRowIndex === -1 || headerRowIndex >= rows.length - 1) {
    throw new Error('Não foi possível identificar o cabeçalho no arquivo.');
  }

  const headers = rows[headerRowIndex].map((h) => (h ? String(h).trim().toLowerCase() : ''));

  // Column mapping helper
  const findColIndex = (matchFn: (h: string) => boolean) => {
    return headers.findIndex((h) => matchFn(h));
  };

  const colData = findColIndex((h) => h === 'data' || h.includes('periodo') || h.includes('período') || h.includes('mês') || h.includes('mes'));
  const colImpressoes = findColIndex((h) => h.includes('impress'));
  const colAlcance = findColIndex((h) => h.includes('alcance') || h.includes('reach'));
  const colClick = findColIndex((h) => h.includes('click') || h.includes('clique'));
  const colContatos = findColIndex((h) => h.includes('contato') && !h.includes('?'));
  const colOrcamentos = findColIndex((h) => (h.includes('orçamento') || h.includes('orcamento') || h.includes('proposta')) && !h.includes('?'));
  const colVendas = findColIndex((h) => (h.includes('venda') || h.includes('vendas')) && !h.includes('?'));
  const colFaturamento = findColIndex((h) => h.includes('faturamento') || h.includes('receita'));
  const colLucro = findColIndex((h) => h.includes('lucro') && !h.includes('médio') && !h.includes('medio') && !h.includes('/'));

  // Calculated rate column mappings
  const colContatoOrcamento = findColIndex((h) => (h.includes('contato') && (h.includes('orçamento') || h.includes('orcamento'))) || h.includes('contato ? or') || h.includes('contato -> or'));
  const colOrcamentoVenda = findColIndex((h) => ((h.includes('orçamento') || h.includes('orcamento')) && h.includes('venda')) || h.includes('orçamento ? ve') || h.includes('orcamento ? ve') || h.includes('orçamento -> ve'));
  const colContatoVenda = findColIndex((h) => (h.includes('contato') && h.includes('venda')) || h.includes('contato ? ve') || h.includes('contato -> ve'));
  const colMargemBruta = findColIndex((h) => h.includes('margem'));
  const colTicketMedio = findColIndex((h) => h.includes('ticket'));
  const colLucroMedio = findColIndex((h) => h.includes('lucro') && (h.includes('médio') || h.includes('medio')));

  const periods: PeriodData[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue;
    }

    const dataName = colData !== -1 && row[colData] ? String(row[colData]).trim() : `Período ${i - headerRowIndex}`;
    const impressoes = colImpressoes !== -1 ? parsePtBrNumber(row[colImpressoes]) : 0;
    const alcance = colAlcance !== -1 ? parsePtBrNumber(row[colAlcance]) : 0;
    const click = colClick !== -1 ? parsePtBrNumber(row[colClick]) : 0;
    const contatos = colContatos !== -1 ? parsePtBrNumber(row[colContatos]) : 0;
    const orcamentos = colOrcamentos !== -1 ? parsePtBrNumber(row[colOrcamentos]) : 0;
    const vendas = colVendas !== -1 ? parsePtBrNumber(row[colVendas]) : 0;
    const faturamento = colFaturamento !== -1 ? parsePtBrNumber(row[colFaturamento]) : 0;
    const lucroBruto = colLucro !== -1 ? parsePtBrNumber(row[colLucro]) : 0;

    // Rates (if in Excel or computed)
    const contatoParaOrcamento = colContatoOrcamento !== -1 && row[colContatoOrcamento] !== undefined
      ? parsePtBrNumber(row[colContatoOrcamento])
      : contatos > 0 ? (orcamentos / contatos) * 100 : 0;

    const orcamentoParaVenda = colOrcamentoVenda !== -1 && row[colOrcamentoVenda] !== undefined
      ? parsePtBrNumber(row[colOrcamentoVenda])
      : orcamentos > 0 ? (vendas / orcamentos) * 100 : 0;

    const contatoParaVenda = colContatoVenda !== -1 && row[colContatoVenda] !== undefined
      ? parsePtBrNumber(row[colContatoVenda])
      : contatos > 0 ? (vendas / contatos) * 100 : 0;

    const margemBruta = colMargemBruta !== -1 && row[colMargemBruta] !== undefined
      ? parsePtBrNumber(row[colMargemBruta])
      : faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0;

    const ticketMedio = colTicketMedio !== -1 && row[colTicketMedio] !== undefined
      ? parsePtBrNumber(row[colTicketMedio])
      : vendas > 0 ? faturamento / vendas : 0;

    const lucroBrutoMedio = colLucroMedio !== -1 && row[colLucroMedio] !== undefined
      ? parsePtBrNumber(row[colLucroMedio])
      : vendas > 0 ? lucroBruto / vendas : 0;

    periods.push({
      id: `p_${i}_${Date.now()}`,
      data: dataName,
      impressoes,
      alcance,
      click,
      contatos,
      orcamentos,
      vendas,
      faturamento,
      lucroBruto,
      contatoParaOrcamento,
      orcamentoParaVenda,
      contatoParaVenda,
      margemBruta,
      ticketMedio,
      lucroBrutoMedio,
    });
  }

  if (periods.length === 0) {
    throw new Error('Nenhum período válido foi encontrado no arquivo.');
  }

  return periods;
}

/**
 * Parses a CSV string (supports ; and , delimiters)
 */
export function parseCSVContent(csvString: string): PeriodData[] {
  const parsed = Papa.parse<string[]>(csvString, {
    skipEmptyLines: 'greedy',
    header: false,
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('O arquivo CSV está vazio.');
  }

  return parseMatrixToPeriods(parsed.data);
}

/**
 * Parses an Excel (.xlsx, .xls) ArrayBuffer
 */
export function parseExcelBuffer(buffer: ArrayBuffer): PeriodData[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('A planilha está vazia.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  return parseMatrixToPeriods(rows);
}

export function generateSampleExcelCSV(): string {
  return `Data;Impressões;Alcance;Click;Contatos;Orçamentos;Vendas;Faturamento;Lucro Bruto;Contato → Orçamento;Orçamento → Venda;Contato → Venda;Margem Bruta;Ticket médio por venda;Lucro bruto médio/venda
08/07 a 05/08;33333;22222;11111;5.773;1.376;246;R$ 321.415;R$ 110.000;23,84%;17,88%;4,26%;34,22%;R$ 1.306,57;R$ 447,15
06/ago;33333;22222;11111;1234;1438;254;R$ 328.379;R$ 116.922;116,53%;17,66%;20,58%;35,61%;R$ 1.292,83;R$ 460,32`;
}
