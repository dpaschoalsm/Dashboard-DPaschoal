import React, { useState } from 'react';
import { formatNumber, formatPercent } from '../utils/formatters';

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(impressoes, alcance, click, contatos, orcamentos, vendas, 1);

  const stages = [
    { name: 'Impressões', count: impressoes },
    { name: 'Alcance', count: alcance },
    { name: 'Click', count: click },
    { name: 'Contatos', count: contatos },
    { name: 'Orçamentos', count: orcamentos },
    { name: 'Vendas', count: vendas },
  ];

  // Helper to calculate conversion rate from previous stage
  const getStageConversionRate = (idx: number, count: number): number => {
    if (idx === 0) return 100;
    const prevStage = stages[idx - 1];
    if (!prevStage || prevStage.count === 0) return 0;
    return (count / prevStage.count) * 100;
  };

  const getStageTooltipText = (idx: number, count: number) => {
    if (idx === 0) {
      return {
        mainInfo: '100% • Topo do Funil',
        detail: 'Volume total de visualizações de anúncios',
      };
    }

    const prevStage = stages[idx - 1];
    const convRate = getStageConversionRate(idx, count);

    switch (idx) {
      case 1: // Alcance
        return {
          mainInfo: `${formatPercent(convRate)} de aproveitamento das impressões`,
          detail: 'Proporção de pessoas únicas alcançadas',
        };
      case 2: // Click
        return {
          mainInfo: `${formatPercent(convRate)} de taxa de clique (CTR)`,
          detail: 'Percentual de pessoas alcançadas que clicaram',
        };
      case 3: // Contatos
        return {
          mainInfo: `${formatPercent(convRate)} dos cliques viraram contatos`,
          detail: 'Conversão de visitantes para início de conversa',
        };
      case 4: // Orçamentos
        return {
          mainInfo: `${formatPercent(convRate)} dos contatos pediram orçamento`,
          detail: 'Conversão de contatos em orçamentos gerados',
        };
      case 5: { // Vendas
        const finalConv = contatos > 0 ? (count / contatos) * 100 : 0;
        return {
          mainInfo: `${formatPercent(convRate)} dos orçamentos viraram vendas`,
          detail: `Taxa final de fechamento: ${formatPercent(finalConv)} dos contatos fecharam negócio`,
        };
      }
      default:
        return {
          mainInfo: `${formatPercent(convRate)} de conversão`,
          detail: `Relação com a etapa de ${prevStage.name}`,
        };
    }
  };

  return (
    <div className="w-full flex flex-col justify-center py-2 h-full relative">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">
            Funil de Conversão
          </h3>
          <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
            Taxa de Conversão
          </span>
        </div>
        <span className="text-[11px] text-gray-400 font-medium hidden sm:inline-block">
          Passe o mouse sobre as etapas para detalhes
        </span>
      </div>

      <div className="flex flex-col space-y-3 w-full">
        {stages.map((stage, idx) => {
          // Calculate percentage relative to max value (Impressões)
          const rawPct = (stage.count / maxValue) * 100;
          // Set a visual minimum width so even small numbers are visible as a centered funnel bar
          const visualWidthPct = Math.max(rawPct, 3.5);

          const isHovered = hoveredIndex === idx;
          const isNarrow = rawPct < 14;
          const tooltip = getStageTooltipText(idx, stage.count);
          const convRate = getStageConversionRate(idx, stage.count);

          return (
            <div
              key={stage.name}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`relative flex items-center w-full min-h-[44px] px-2 py-1.5 rounded-xl transition-all duration-150 cursor-pointer ${
                isHovered ? 'bg-red-50/70 border border-red-200/80 shadow-2xs' : 'border border-transparent'
              }`}
            >
              {/* Stage Name on Left */}
              <div className="w-24 sm:w-28 pr-2 text-right text-xs sm:text-sm font-semibold text-gray-700 select-none shrink-0">
                {stage.name}
              </div>

              {/* Divider line */}
              <div className="w-[1px] h-8 bg-gray-200 mr-2.5 shrink-0" />

              {/* Funnel Bar Container */}
              <div className="flex-1 flex justify-center items-center relative py-1">
                <div
                  className={`transition-all duration-300 rounded-sm flex items-center justify-center font-semibold text-xs py-2 shadow-2xs relative ${
                    isHovered ? 'bg-[#B91C1C] scale-[1.02]' : 'bg-[#DC2626]'
                  }`}
                  style={{
                    width: `${visualWidthPct}%`,
                    minHeight: '32px',
                  }}
                >
                  {/* If bar is wide enough, show text inside */}
                  {!isNarrow && (
                    <span className="text-white z-10 px-1 truncate text-[11px] sm:text-xs font-bold">
                      {formatNumber(stage.count)}
                    </span>
                  )}
                </div>

                {/* If bar is narrow (like Orçamentos / Vendas), show number on right side of bar */}
                {isNarrow && (
                  <span className="ml-2 text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 shrink-0 whitespace-nowrap shadow-2xs">
                    {formatNumber(stage.count)}
                  </span>
                )}
              </div>

              {/* Step-by-Step Conversion Rate badge on right */}
              <div className="w-24 sm:w-28 pl-2 flex justify-end items-center shrink-0">
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-lg font-bold text-xs whitespace-nowrap shadow-2xs transition-all ${
                    idx === 0
                      ? 'bg-gray-100 text-gray-700 border border-gray-200 font-semibold'
                      : 'bg-red-50 text-[#DC2626] border border-red-200'
                  }`}
                  title={tooltip.mainInfo}
                >
                  <span>{formatPercent(convRate)}</span>
                </div>
              </div>

              {/* Hover Tooltip Popup */}
              {isHovered && (
                <div className="absolute left-1/2 -top-18 -translate-x-1/2 z-30 bg-gray-900 text-white p-2.5 rounded-xl shadow-xl text-xs whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-gray-700 min-w-[230px]">
                  <div className="font-bold text-red-400 mb-1 border-b border-gray-700/80 pb-1 flex items-center justify-between gap-3">
                    <span>{stage.name}</span>
                    <span className="text-white font-extrabold">{formatNumber(stage.count)}</span>
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <div className="font-semibold text-emerald-400">{tooltip.mainInfo}</div>
                    <div className="text-gray-300 text-[10px]">{tooltip.detail}</div>
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-gray-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
