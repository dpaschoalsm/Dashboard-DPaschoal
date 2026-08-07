import React, { useState, useRef } from 'react';
import { DashboardData } from './types';
import { DEFAULT_DATA } from './utils/csvParser';
import { formatCurrency, formatPercent } from './utils/formatters';
import { MetricCard } from './components/MetricCard';
import { FunnelChart } from './components/FunnelChart';
import { ConversionChart } from './components/ConversionChart';
import { ExportHeader } from './components/ExportHeader';
import { CsvUploaderModal } from './components/CsvUploaderModal';
import { ManualDataEditorModal } from './components/ManualDataEditorModal';

export default function App() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Computed metrics
  const ticketMedio = data.vendas > 0 ? data.faturamento / data.vendas : 0;
  const lucroBrutoMedio = data.vendas > 0 ? data.lucroBruto / data.vendas : 0;
  const margemBruta = data.faturamento > 0 ? (data.lucroBruto / data.faturamento) * 100 : 0;

  const handleReset = () => {
    setData(DEFAULT_DATA);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col text-gray-900 font-sans antialiased selection:bg-[#DC2626]/20">
      {/* Action Header */}
      <ExportHeader
        exportRef={dashboardRef}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        onResetData={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {/* Exportable Dashboard Container */}
        <div
          ref={dashboardRef}
          className="bg-white p-6 sm:p-10 rounded-2xl border border-gray-200/80 shadow-xs space-y-8 max-w-[1200px] mx-auto"
          style={{ minWidth: '320px' }}
        >
          {/* Top Row: 5 Metric Cards matching the exact layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <MetricCard
              label="Faturamento"
              value={formatCurrency(data.faturamento)}
            />
            <MetricCard
              label="Ticket Médio"
              value={formatCurrency(ticketMedio)}
            />
            <MetricCard
              label="Lucro Bruto"
              value={formatCurrency(data.lucroBruto)}
            />
            <MetricCard
              label="Lucro Bruto Médio"
              value={formatCurrency(lucroBrutoMedio)}
            />
            <MetricCard
              label="Margem Bruta"
              value={formatPercent(margemBruta)}
            />
          </div>

          {/* Bottom Grid: Funnel Chart on Left, Conversion Rate Chart on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-2">
            {/* Left: Funnel Chart */}
            <div className="flex flex-col h-full justify-center">
              <FunnelChart
                contatos={data.contatos}
                orcamentos={data.orcamentos}
                vendas={data.vendas}
              />
            </div>

            {/* Right: Conversion Rate Bar Chart */}
            <div className="flex flex-col h-full justify-center">
              <ConversionChart
                contatos={data.contatos}
                orcamentos={data.orcamentos}
                vendas={data.vendas}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-200 text-center text-xs text-gray-400">
        Dashboard de Conversão & Vendas • Atualização via CSV e Exportação PNG
      </footer>

      {/* Modals */}
      <CsvUploaderModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onDataLoaded={(newData) => setData(newData)}
      />

      <ManualDataEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        data={data}
        onSave={(newData) => setData(newData)}
      />
    </div>
  );
}
