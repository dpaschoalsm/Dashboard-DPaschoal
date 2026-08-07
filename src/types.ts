export interface DashboardData {
  contatos: number;
  orcamentos: number;
  vendas: number;
  faturamento: number;
  lucroBruto: number;
  // Calculated fields (or overridden if provided)
  ticketMedio?: number;
  lucroBrutoMedio?: number;
  margemBruta?: number; // percentage, e.g. 34.22
}

export interface FunnelStage {
  label: string;
  value: number;
  percentageOfFirst: number;
}

export interface ConversionRate {
  label: string;
  rate: number; // e.g. 23.84
  formattedRate: string;
}
