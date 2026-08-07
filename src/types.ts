export interface PeriodData {
  id: string;
  data: string; // Period name e.g. "08/07 a 05/08", "06/ago"
  impressoes: number;
  alcance: number;
  click: number;
  contatos: number;
  orcamentos: number;
  vendas: number;
  faturamento: number;
  lucroBruto: number;
  
  // Optional calculated/overridden fields
  contatoParaOrcamento?: number; // percentage e.g. 23.84
  orcamentoParaVenda?: number;   // percentage e.g. 17.88
  contatoParaVenda?: number;     // percentage e.g. 4.26
  margemBruta?: number;          // percentage e.g. 34.22
  ticketMedio?: number;          // R$ e.g. 1306.57
  lucroBrutoMedio?: number;      // R$ e.g. 447.15
}

export interface FullDashboardState {
  periods: PeriodData[];
  selectedPeriodId: string; // 'latest' | 'total' | id
}
