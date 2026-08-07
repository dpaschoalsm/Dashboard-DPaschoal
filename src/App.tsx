import React, { useState, useRef } from 'react';
import { PeriodData } from './types';
import { DEFAULT_PERIODS } from './utils/csvParser';
import { formatCurrency, formatPercent } from './utils/formatters';
import { MetricCard } from './components/MetricCard';
import { FunnelChart } from './components/FunnelChart';
import { FinancialComboChart } from './components/FinancialComboChart';
import { ConversionChart } from './components/ConversionChart';
import { ExportHeader } from './components/ExportHeader';
import { CsvUploaderModal } from './components/CsvUploaderModal';
import { ManualDataEditorModal } from './components/ManualDataEditorModal';
import { Calendar, Layers } from 'lucide-react';

export default function App() {
  const [periods, setPeriods] = useState<PeriodData[]>(DEFAULT_PERIODS);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(DEFAULT_PERIODS[0].id);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    setPeriods(DEFAULT_PERIODS);
    setSelectedPeriodId(DEFAULT_PERIODS[0].id);
  };

  // Get current active metrics (either single period or total consolidated)
  const isConsolidated = selectedPeriodId === 'consolidated';

  let currentImpressoes = 0;
  let currentAlcance = 0;
  let currentClick = 0;
  let currentContatos = 0;
  let currentOrcamentos = 0;
  let currentVendas = 0;
  let currentFaturamento = 0;
  let currentLucroBruto = 0;
  let currentTicketMedio = 0;
  let currentLucroBrutoMedio = 0;
  let currentMargemBruta = 0;

  if (isConsolidated) {
    currentImpressoes = periods.reduce((acc, p) => acc + p.impressoes, 0);
    currentAlcance = periods.reduce((acc, p) => acc + p.alcance, 0);
    currentClick = periods.reduce((acc, p) => acc + p.click, 0);
    currentContatos = periods.reduce((acc, p) => acc + p.contatos, 0);
    currentOrcamentos = periods.reduce((acc, p) => acc + p.orcamentos, 0);
    currentVendas = periods.reduce((acc, p) => acc + p.vendas, 0);
    currentFaturamento = periods.reduce((acc, p) => acc + p.faturamento, 0);
    currentLucroBruto = periods.reduce((acc, p) => acc + p.lucroBruto, 0);

    currentTicketMedio = currentVendas > 0 ? currentFaturamento / currentVendas : 0;
    currentLucroBrutoMedio = currentVendas > 0 ? currentLucroBruto / currentVendas : 0;
    currentMargemBruta = currentFaturamento > 0 ? (currentLucroBruto / currentFaturamento) * 100 : 0;
  } else {
    const activePeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];
    currentImpressoes = activePeriod.impressoes;
    currentAlcance = activePeriod.alcance;
    currentClick = activePeriod.click;
    currentContatos = activePeriod.contatos;
    currentOrcamentos = activePeriod.orcamentos;
    currentVendas = activePeriod.vendas;
    currentFaturamento = activePeriod.faturamento;
    currentLucroBruto = activePeriod.lucroBruto;

    currentTicketMedio = activePeriod.ticketMedio ?? (currentVendas > 0 ? currentFaturamento / currentVendas : 0);
    currentLucroBrutoMedio = activePeriod.lucroBrutoMedio ?? (currentVendas > 0 ? currentLucroBruto / currentVendas : 0);
    currentMargemBruta = activePeriod.margemBruta ?? (currentFaturamento > 0 ? (currentLucroBruto / currentFaturamento) * 100 : 0);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans antialiased selection:bg-[#DC2626]/20">
      {/* Top Header Controls */}
      <ExportHeader
        exportRef={dashboardRef}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        onResetData={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Period Selection Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 font-medium">
            <Calendar className="w-4 h-4 text-[#DC2626]" />
            <span>Filtrar Funil e KPIs por Período:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriodId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedPeriodId === p.id
                    ? 'bg-[#DC2626] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.data}
              </button>
            ))}

            <button
              onClick={() => setSelectedPeriodId('consolidated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedPeriodId === 'consolidated'
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Consolidado (Todos)
            </button>
          </div>
        </div>

        {/* Exportable Dashboard Area */}
        <div
          ref={dashboardRef}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-8"
        >
          {/* Top Row: 5 Pill Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <MetricCard
              label="Faturamento"
              value={formatCurrency(currentFaturamento)}
            />
            <MetricCard
              label="Ticket Médio"
              value={formatCurrency(currentTicketMedio)}
            />
            <MetricCard
              label="Lucro Bruto"
              value={formatCurrency(currentLucroBruto)}
            />
            <MetricCard
              label="Lucro Bruto Médio"
              value={formatCurrency(currentLucroBrutoMedio)}
            />
            <MetricCard
              label="Margem Bruta"
              value={formatPercent(currentMargemBruta)}
            />
          </div>

          {/* Middle Row: Funnel (Left) & Financial Combo Chart (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-2">
            {/* Left: Funnel Chart with 6 stages */}
            <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 flex flex-col justify-center">
              <FunnelChart
                impressoes={currentImpressoes}
                alcance={currentAlcance}
                click={currentClick}
                contatos={currentContatos}
                orcamentos={currentOrcamentos}
                vendas={currentVendas}
              />
            </div>

            {/* Right: Financial Combo Chart (Faturamento vs Lucro Bruto across periods) */}
            <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 flex flex-col justify-center">
              <FinancialComboChart periods={periods} />
            </div>
          </div>

          {/* Bottom Row: Full-Width Conversion Rates Chart */}
          <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 pt-4">
            <ConversionChart periods={periods} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-200 text-center text-xs text-gray-400">
        Dashboard de Conversão & Vendas • DPASCHOAL • Atualização via Planilha (.xlsx / .csv)
      </footer>

      {/* Modals */}
      <CsvUploaderModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onDataLoaded={(newPeriods) => {
          setPeriods(newPeriods);
          if (newPeriods.length > 0) {
            setSelectedPeriodId(newPeriods[0].id);
          }
        }}
      />

      <ManualDataEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        periods={periods}
        onSave={(newPeriods) => {
          setPeriods(newPeriods);
        }}
      />
    </div>
  );
}
