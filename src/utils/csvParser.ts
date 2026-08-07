import Papa from 'papaparse';
import { DashboardData } from '../types';
import { parsePtBrNumber } from './formatters';

export const DEFAULT_DATA: DashboardData = {
  contatos: 5773,
  orcamentos: 1376,
  vendas: 246,
  faturamento: 321415,
  lucroBruto: 110000,
};

export function parseCSVContent(csvString: string): DashboardData {
  const parsed = Papa.parse<Record<string, string> | string[]>(csvString, {
    skipEmptyLines: true,
    header: false,
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('O arquivo CSV está vazio.');
  }

  const rows = parsed.data as string[][];

  const result: Partial<DashboardData> = {};

  // Case 1: Key-Value rows e.g. "Contatos,5773" or "Faturamento,321415"
  let matchedKeyValue = false;
  for (const row of rows) {
    if (row.length >= 2) {
      const key = row[0].toString().trim().toLowerCase();
      const val = parsePtBrNumber(row[1]);

      if (key.includes('contato')) {
        result.contatos = val;
        matchedKeyValue = true;
      } else if (key.includes('orçamento') || key.includes('orcamento')) {
        result.orcamentos = val;
        matchedKeyValue = true;
      } else if (key.includes('venda')) {
        result.vendas = val;
        matchedKeyValue = true;
      } else if (key.includes('faturamento') || key.includes('receita')) {
        result.faturamento = val;
        matchedKeyValue = true;
      } else if (key.includes('lucro') && !key.includes('médio') && !key.includes('medio')) {
        result.lucroBruto = val;
        matchedKeyValue = true;
      }
    }
  }

  if (matchedKeyValue && result.contatos !== undefined) {
    return {
      contatos: result.contatos ?? DEFAULT_DATA.contatos,
      orcamentos: result.orcamentos ?? DEFAULT_DATA.orcamentos,
      vendas: result.vendas ?? DEFAULT_DATA.vendas,
      faturamento: result.faturamento ?? DEFAULT_DATA.faturamento,
      lucroBruto: result.lucroBruto ?? DEFAULT_DATA.lucroBruto,
    };
  }

  // Case 2: Column Headers in row 0 e.g. Contatos, Orçamentos, Vendas, Faturamento, Lucro Bruto
  if (rows.length >= 2) {
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const dataRow = rows[1];

    headers.forEach((header, index) => {
      const val = parsePtBrNumber(dataRow[index]);
      if (header.includes('contato')) result.contatos = val;
      if (header.includes('orçamento') || header.includes('orcamento')) result.orcamentos = val;
      if (header.includes('venda')) result.vendas = val;
      if (header.includes('faturamento') || header.includes('receita')) result.faturamento = val;
      if (header.includes('lucro') && !header.includes('médio') && !header.includes('medio')) result.lucroBruto = val;
    });

    if (result.contatos !== undefined || result.faturamento !== undefined) {
      return {
        contatos: result.contatos ?? DEFAULT_DATA.contatos,
        orcamentos: result.orcamentos ?? DEFAULT_DATA.orcamentos,
        vendas: result.vendas ?? DEFAULT_DATA.vendas,
        faturamento: result.faturamento ?? DEFAULT_DATA.faturamento,
        lucroBruto: result.lucroBruto ?? DEFAULT_DATA.lucroBruto,
      };
    }
  }

  // Case 3: Detailed transaction rows (Status, Valor, Lucro)
  let contatosCount = 0;
  let orcamentosCount = 0;
  let vendasCount = 0;
  let totalFaturamento = 0;
  let totalLucro = 0;

  let foundTransactions = false;

  for (let i = 1; i < rows.length; i++) {
    const rowStr = rows[i].join(' ').toLowerCase();
    if (rowStr.includes('contato') || rowStr.includes('lead')) {
      contatosCount++;
      foundTransactions = true;
    }
    if (rowStr.includes('orçamento') || rowStr.includes('orcamento') || rowStr.includes('proposta')) {
      orcamentosCount++;
      foundTransactions = true;
    }
    if (rowStr.includes('venda') || rowStr.includes('fechado') || rowStr.includes('ganho')) {
      vendasCount++;
      foundTransactions = true;
      // try to extract value & profit from line
      const numbers = rows[i].map(parsePtBrNumber).filter((n) => n > 0);
      if (numbers.length >= 1) totalFaturamento += numbers[0];
      if (numbers.length >= 2) totalLucro += numbers[1];
    }
  }

  if (foundTransactions) {
    return {
      contatos: contatosCount || DEFAULT_DATA.contatos,
      orcamentos: orcamentosCount || DEFAULT_DATA.orcamentos,
      vendas: vendasCount || DEFAULT_DATA.vendas,
      faturamento: totalFaturamento || DEFAULT_DATA.faturamento,
      lucroBruto: totalLucro || DEFAULT_DATA.lucroBruto,
    };
  }

  throw new Error(
    'Não foi possível reconhecer a estrutura do arquivo CSV. Use as colunas: Contatos, Orçamentos, Vendas, Faturamento, Lucro Bruto.'
  );
}

export function generateSampleSummaryCSV(): string {
  return `Métrica,Valor
Contatos,5773
Orçamentos,1376
Vendas,246
Faturamento,321415
Lucro Bruto,110000`;
}

export function generateSampleHorizontalCSV(): string {
  return `Contatos,Orçamentos,Vendas,Faturamento,Lucro Bruto
5773,1376,246,321415,110000`;
}
