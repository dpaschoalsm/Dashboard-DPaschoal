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
    investimento: 45000,
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
    investimento: 42000,
    contatoParaOrcamento: 116.53,
    orcamentoParaVenda: 17.66,
    contatoParaVenda: 20.58,
    margemBruta: 35.61,
    ticketMedio: 1292.83,
    lucroBrutoMedio: 460.32,
  },
];

/**
 * Helper to format date cells (converting Excel serial date numbers like 46240 or Date objects)
 */
export function formatDateCell(cellVal: any): string {
  if (cellVal === null || cellVal === undefined) return '';

  // If already a JS Date object (e.g. from XLSX with cellDates: true)
  if (cellVal instanceof Date) {
    const day = String(cellVal.getUTCDate()).padStart(2, '0');
    const month = String(cellVal.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  const str = String(cellVal).trim();
  if (!str) return '';

  // Check if string is a numeric Excel serial date (e.g. 46240)
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    try {
      if (XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
        const d = XLSX.SSF.parse_date_code(num);
        if (d && d.d && d.m) {
          const day = String(d.d).padStart(2, '0');
          const month = String(d.m).padStart(2, '0');
          return `${day}/${month}`;
        }
      }
      // Fallback calculation for Excel serial date code
      const jsDate = new Date((num - (25567 + 2)) * 86400 * 1000);
      const day = String(jsDate.getUTCDate()).padStart(2, '0');
      const month = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    } catch {
      // return original string if conversion fails
    }
  }

  return str;
}

/**
 * Helper to parse percentage cells (converting Excel decimal fractions like 0.3957 to 39.57 or 1.4884 to 148.84)
 */
export function parsePercentageVal(val: any, fallbackCalc: () => number): number {
  if (val === undefined || val === null || String(val).trim() === '') {
    return fallbackCalc();
  }

  if (typeof val === 'number') {
    if (isNaN(val)) return fallbackCalc();
    // Excel stores percentages as decimal fractions (e.g. 0.3957 for 39.57%, 1.4884 for 148.84%)
    if (Math.abs(val) <= 10.0 && val !== 0) {
      return val * 100;
    }
    return val;
  }

  const str = String(val).trim();
  const num = parsePtBrNumber(str);

  // If string was a raw decimal number without '%' (e.g. "0.3957" or "1.4884")
  if (!str.includes('%') && Math.abs(num) <= 10.0 && num !== 0) {
    return num * 100;
  }

  return num;
}

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

  // Helper to identify rate/conversion ratio headers
  const isRateHeader = (h: string) =>
    h.includes('->') || h.includes('→') || h.includes('?') || h.includes('/') || h.includes('médio') || h.includes('medio') || h.includes('ticket') || h.includes('margem');

  // Conversion rate column mappings
  const colContatoOrcamento = findColIndex((h) =>
    (h.includes('contato') && (h.includes('orçamento') || h.includes('orcamento'))) ||
    h.includes('contato ->') || h.includes('contato →') || h.includes('contato ?') || h.includes('contato a ')
  );

  const colOrcamentoVenda = findColIndex((h) =>
    ((h.includes('orçamento') || h.includes('orcamento')) && h.includes('venda')) ||
    h.includes('orçamento ->') || h.includes('orcamento ->') || h.includes('orçamento →') || h.includes('orçamento ?') || h.includes('orçamento a ')
  );

  const colContatoVenda = findColIndex((h) =>
    (h.includes('contato') && h.includes('venda')) ||
    h.includes('contato -> ve') || h.includes('contato → ve') || h.includes('contato ? ve')
  );

  const colMargemBruta = findColIndex((h) => h.includes('margem'));
  const colTicketMedio = findColIndex((h) => h.includes('ticket'));
  const colLucroMedio = findColIndex((h) => h.includes('lucro') && (h.includes('médio') || h.includes('medio')));

  // Base metric columns
  const colData = findColIndex((h) => h === 'data' || h.includes('periodo') || h.includes('período') || h.includes('mês') || h.includes('mes'));
  const colImpressoes = findColIndex((h) => h.includes('impress'));
  const colAlcance = findColIndex((h) => h.includes('alcance') || h.includes('reach'));
  const colClick = findColIndex((h) => h.includes('click') || h.includes('clique'));

  // Contatos
  let colContatos = findColIndex((h) => h === 'contatos' || h === 'contato' || h === 'leads' || h === 'lead');
  if (colContatos === -1) {
    colContatos = findColIndex((h) => (h.includes('contato') || h.includes('lead')) && !isRateHeader(h) && !h.includes('orçamento') && !h.includes('orcamento') && !h.includes('venda'));
  }

  // Orçamentos
  let colOrcamentos = findColIndex((h) => h === 'orçamentos' || h === 'orcamentos' || h === 'orçamento' || h === 'orcamento' || h === 'propostas' || h === 'proposta');
  if (colOrcamentos === -1) {
    colOrcamentos = findColIndex((h) => (h.includes('orçamento') || h.includes('orcamento') || h.includes('proposta')) && !isRateHeader(h) && !h.includes('contato') && !h.includes('venda'));
  }

  // Vendas
  let colVendas = findColIndex((h) => h === 'vendas' || h === 'venda' || h === 'qtd vendas' || h === 'qtd de vendas' || h === 'num vendas' || h === 'número de vendas');
  if (colVendas === -1) {
    colVendas = findColIndex((h) => (h.includes('venda') || h.includes('vendas')) && !isRateHeader(h) && !h.includes('contato') && !h.includes('orçamento') && !h.includes('orcamento'));
  }

  // Faturamento
  let colFaturamento = findColIndex((h) => h === 'faturamento' || h === 'receita' || h === 'faturamento total');
  if (colFaturamento === -1) {
    colFaturamento = findColIndex((h) => (h.includes('faturamento') || h.includes('receita')) && !isRateHeader(h));
  }

  // Lucro Bruto
  let colLucro = findColIndex((h) => h === 'lucro bruto' || h === 'lucro');
  if (colLucro === -1) {
    colLucro = findColIndex((h) => h.includes('lucro') && !isRateHeader(h));
  }

  // Investimento (Investment / Ads Spend)
  let colInvestimento = findColIndex((h) =>
    h === 'investimento' || h === 'investimentos' || h === 'investimento total' || h === 'valor investido' || h === 'gasto' || h === 'gastos' || h === 'custo' || h === 'spend' || h === 'ads'
  );
  if (colInvestimento === -1) {
    colInvestimento = findColIndex((h) =>
      (h.includes('invest') || h.includes('gasto') || h.includes('custo') || h.includes('spend') || h.includes('ads')) && !isRateHeader(h)
    );
  }

  const periods: PeriodData[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue;
    }

    const rawDataVal = colData !== -1 ? row[colData] : null;
    const hasAnyMetricData = [
      colImpressoes,
      colAlcance,
      colClick,
      colContatos,
      colOrcamentos,
      colVendas,
      colFaturamento,
      colLucro,
      colInvestimento,
    ].some((c) => c !== -1 && row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '');

    // Skip empty trailing date rows with no metrics
    if (!hasAnyMetricData && !rawDataVal) {
      continue;
    }
    if (!hasAnyMetricData && row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length <= 1) {
      continue;
    }

    const dataName = rawDataVal !== null && rawDataVal !== undefined && String(rawDataVal).trim() !== ''
      ? formatDateCell(rawDataVal)
      : `Período ${i - headerRowIndex}`;
    const impressoes = colImpressoes !== -1 ? parsePtBrNumber(row[colImpressoes]) : 0;
    const alcance = colAlcance !== -1 ? parsePtBrNumber(row[colAlcance]) : 0;
    const click = colClick !== -1 ? parsePtBrNumber(row[colClick]) : 0;
    const contatos = colContatos !== -1 ? parsePtBrNumber(row[colContatos]) : 0;
    const orcamentos = colOrcamentos !== -1 ? parsePtBrNumber(row[colOrcamentos]) : 0;
    const vendas = colVendas !== -1 ? parsePtBrNumber(row[colVendas]) : 0;
    const faturamento = colFaturamento !== -1 ? parsePtBrNumber(row[colFaturamento]) : 0;
    const lucroBruto = colLucro !== -1 ? parsePtBrNumber(row[colLucro]) : 0;
    const investimento = colInvestimento !== -1 ? parsePtBrNumber(row[colInvestimento]) : 0;

    // Rates (if in Excel or computed)
    const contatoParaOrcamento = parsePercentageVal(
      colContatoOrcamento !== -1 ? row[colContatoOrcamento] : undefined,
      () => (contatos > 0 ? (orcamentos / contatos) * 100 : 0)
    );

    const orcamentoParaVenda = parsePercentageVal(
      colOrcamentoVenda !== -1 ? row[colOrcamentoVenda] : undefined,
      () => (orcamentos > 0 ? (vendas / orcamentos) * 100 : 0)
    );

    const contatoParaVenda = parsePercentageVal(
      colContatoVenda !== -1 ? row[colContatoVenda] : undefined,
      () => (contatos > 0 ? (vendas / contatos) * 100 : 0)
    );

    const margemBruta = parsePercentageVal(
      colMargemBruta !== -1 ? row[colMargemBruta] : undefined,
      () => (faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0)
    );

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
      investimento,
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
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: true, cellText: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('A planilha está vazia.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, dateNF: 'dd/mm/yyyy' });

  return parseMatrixToPeriods(rows);
}

export function generateSampleExcelCSV(): string {
  return `Data;Impressões;Alcance;Click;Contatos;Orçamentos;Vendas;Faturamento;Lucro Bruto;Investimento;Contato → Orçamento;Orçamento → Venda;Contato → Venda;Margem Bruta;Ticket médio por venda;Lucro bruto médio/venda
08/07 a 05/08;33333;22222;11111;5.773;1.376;246;R$ 321.415;R$ 110.000;R$ 45.000;23,84%;17,88%;4,26%;34,22%;R$ 1.306,57;R$ 447,15
06/ago;33333;22222;11111;1234;1438;254;R$ 328.379;R$ 116.922;R$ 42.000;116,53%;17,66%;20,58%;35,61%;R$ 1.292,83;R$ 460,32`;
}
