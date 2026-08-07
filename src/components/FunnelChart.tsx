import React from 'react';
import { formatNumber } from '../utils/formatters';

interface FunnelChartProps {
  impressoes: number;
  alcance: number;
  click: number;
  contatos: number;
  orcamentos: number;
  vendas: number;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({
  impressoes,
  alcance,
  click,
  contatos,
  orcamentos,
  vendas,
}) => {
  const maxValue = Math.max(impressoes, alcance, click, contatos, orcamentos, vendas, 1);

  const stages = [
    { name: 'Impressões', count: impressoes },
    { name: 'Alcance', count: alcance },
    { name: 'Click', count: click },
    { name: 'Contatos', count: contatos },
    { name: 'Orçamentos', count: orcamentos },
    { name: 'Vendas', count: vendas },
  ];

  return (
    <div className="w-full flex flex-col justify-center py-2 h-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center sm:text-left">
        Funil de Conversão
      </h3>
      <div className="flex flex-col space-y-3.5 w-full">
        {stages.map((stage) => {
          // Calculate bar width percentage relative to max value
          const rawPct = (stage.count / maxValue) * 100;
          // Ensure a minimum width (e.g. 2%) so even 0 or 246 is visible as a centered stem
          const widthPct = Math.max(rawPct, 1.8);

          return (
            <div key={stage.name} className="flex items-center w-full min-h-[38px]">
              {/* Stage Label on Left */}
              <div className="w-24 sm:w-28 pr-3 text-right text-xs sm:text-sm font-medium text-gray-600 select-none shrink-0">
                {stage.name}
              </div>

              {/* Thin Vertical Guideline */}
              <div className="w-[1px] h-10 bg-gray-200 mr-3 shrink-0" />

              {/* Bar Container - Centered Funnel Alignment */}
              <div className="flex-1 flex justify-center items-center py-0.5 relative">
                <div
                  className="bg-[#DC2626] transition-all duration-500 rounded-2xs flex items-center justify-center text-white font-medium text-xs py-2 shadow-2xs relative"
                  style={{
                    width: `${widthPct}%`,
                    minHeight: '34px',
                  }}
                >
                  <span className="z-10 px-1 truncate text-[11px] sm:text-xs">
                    {formatNumber(stage.count)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
