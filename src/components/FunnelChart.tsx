import React, { useState } from 'react';
import { formatNumber, formatPercent } from '../utils/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface PreviousStageCounts {
  impressoes?: number | null;
  alcance?: number | null;
  click?: number | null;
  contatos?: number | null;
  orcamentos?: number | null;
  vendas?: number | null;
}

interface FunnelChartProps {
  impressoes: number;
  alcance: number;
  click: number;
  contatos: number;
  orcamentos: number;
  vendas: number;
  previousCounts?: PreviousStageCounts | null;
  comparisonLabel?: string;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({
  impressoes,
  alcance,
  click,
  contatos,
  orcamentos,
  vendas,
  previousCounts,
  comparisonLabel = 'vs. ant.',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(impressoes, alcance, click, contatos, orcamentos, vendas, 1);

  const stages = [
    {
      name: 'Impressões',
      count: impressoes,
      prevCount: previousCounts?.impressoes,
    },
    {
      name: 'Alcance',
      count: alcance,
      prevCount: previousCounts?.alcance,
    },
    {
      name: 'Click',
      count: click,
      prevCount: previousCounts?.click,
    },
    {
      name: 'Contatos',
      count: contatos,
      prevCount: previousCounts?.contatos,
    },
    {
      name: 'Orçamentos',
      count: orcamentos,
      prevCount: previousCounts?.orcamentos,
    },
    {
      name: 'Vendas',
      count: vendas,
      prevCount: previousCounts?.vendas,
    },
  ];

  const getStageChange = (count: number, prevCount?: number | null): number | null => {
    if (prevCount === undefined || prevCount === null) return null;
    if (prevCount === 0) return count > 0 ? 100 : 0;
    return ((count - prevCount) / prevCount) * 100;
  };

  const getStageTooltipText = (idx: number, count: number, prevCount?: number | null) => {
    const change = getStageChange(count, prevCount);

    if (idx === 0) {
      return {
        mainInfo: 'Topo do Funil',
        detail: 'Volume total de exibição dos anúncios',
        change,
      };
    }

    const prevStage = stages[idx - 1];
    const prevStageCount = prevStage.count;
    const convRate = prevStageCount > 0 ? (count / prevStageCount) * 100 : 0;

    switch (idx) {
      case 1: // Alcance
        return {
          mainInfo: `${formatPercent(convRate)} de aproveitamento das impressões`,
          detail: 'Proporção de pessoas únicas alcançadas',
          change,
        };
      case 2: // Click
        return {
          mainInfo: `${formatPercent(convRate)} de taxa de clique (CTR)`,
          detail: 'Percentual de pessoas alcançadas que clicaram',
          change,
        };
      case 3: // Contatos
        return {
          mainInfo: `${formatPercent(convRate)} dos cliques viraram contatos`,
          detail: 'Conversão de visitantes para início de conversa',
          change,
        };
      case 4: // Orçamentos
        return {
          mainInfo: `${formatPercent(convRate)} dos contatos pediram orçamento`,
          detail: 'Conversão de contatos em orçamentos gerados',
          change,
        };
      case 5: { // Vendas
        const finalConv = contatos > 0 ? (count / contatos) * 100 : 0;
        return {
          mainInfo: `${formatPercent(convRate)} dos orçamentos viraram vendas`,
          detail: `Taxa final de fechamento: ${formatPercent(finalConv)} dos contatos fecharam negócio`,
          change,
        };
      }
      default:
        return {
          mainInfo: `${formatPercent(convRate)} de conversão`,
          detail: `Relação com a etapa de ${prevStage.name}`,
          change,
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
          {previousCounts && (
            <span className="text-[10px] font-semibold bg-red-50 text-[#DC2626] px-2 py-0.5 rounded-md border border-red-200">
              Variação {comparisonLabel}
            </span>
          )}
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
          const tooltip = getStageTooltipText(idx, stage.count, stage.prevCount);
          const change = getStageChange(stage.count, stage.prevCount);

          const isPositive = change !== null && change > 0;
          const isNegative = change !== null && change < 0;

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

              {/* Variation vs previous day badge on right */}
              <div className="w-24 sm:w-28 pl-2 flex justify-end items-center shrink-0">
                {change !== null ? (
                  <div
                    className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-2xs transition-transform ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isNegative
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                    title={stage.prevCount !== undefined && stage.prevCount !== null ? `Anterior: ${formatNumber(stage.prevCount)}` : ''}
                  >
                    {isPositive && <TrendingUp className="w-3 h-3 stroke-[2.5]" />}
                    {isNegative && <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
                    {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
                    <span>
                      {isPositive ? '+' : ''}
                      {change.toFixed(1).replace('.', ',')}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300 font-medium select-none">—</span>
                )}
              </div>

              {/* Hover Tooltip Popup */}
              {isHovered && (
                <div className="absolute left-1/2 -top-20 -translate-x-1/2 z-30 bg-gray-900 text-white p-2.5 rounded-xl shadow-xl text-xs whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-gray-700 min-w-[240px]">
                  <div className="font-bold text-red-400 mb-1 border-b border-gray-700/80 pb-1 flex items-center justify-between gap-3">
                    <span>{stage.name}</span>
                    <span className="text-white font-extrabold">{formatNumber(stage.count)}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="font-semibold text-emerald-400">{tooltip.mainInfo}</div>
                    <div className="text-gray-300 text-[10px]">{tooltip.detail}</div>
                    
                    {stage.prevCount !== undefined && stage.prevCount !== null && (
                      <div className="pt-1 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                        <span>Anterior ({comparisonLabel}): <strong className="text-gray-200">{formatNumber(stage.prevCount)}</strong></span>
                        {change !== null && (
                          <span className={`font-bold ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-gray-300'}`}>
                            {isPositive ? '+' : ''}{change.toFixed(2).replace('.', ',')}%
                          </span>
                        )}
                      </div>
                    )}
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
