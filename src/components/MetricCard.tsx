import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  accumulatedValue?: string;
  changePercent?: number | null;
  comparisonLabel?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  accumulatedValue,
  changePercent,
  comparisonLabel = 'vs. ant.',
}) => {
  const isPositive = changePercent !== undefined && changePercent !== null && changePercent > 0;
  const isNegative = changePercent !== undefined && changePercent !== null && changePercent < 0;

  return (
    <div className="bg-white border-2 border-[#DC2626] rounded-[18px] py-3 px-2.5 sm:px-3 flex flex-col items-center justify-between text-center shadow-xs transition-all hover:shadow-md hover:border-[#B91C1C] flex-1 min-w-[155px] min-h-[130px]">
      {/* Header Label */}
      <span className="text-gray-800 font-medium text-xs sm:text-sm leading-tight mb-1">
        {label}
      </span>

      {/* Main Value */}
      <span className="text-[#1A1A1A] font-bold text-base sm:text-lg tracking-tight my-0.5">
        {value}
      </span>

      {/* Bottom Subtext: Total Acumulado & Variação */}
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 w-full flex flex-col items-center gap-1 text-[10px] sm:text-[11px]">
        {accumulatedValue && (
          <div className="text-gray-500 font-medium truncate max-w-full">
            <span className="text-gray-400">Acumulado:</span>{' '}
            <span className="font-semibold text-gray-800">{accumulatedValue}</span>
          </div>
        )}

        {changePercent !== undefined && changePercent !== null && (
          <div
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isNegative
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {isPositive && <TrendingUp className="w-3 h-3 stroke-[2.5]" />}
            {isNegative && <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
            {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
            <span>
              {isPositive ? '+' : ''}
              {changePercent.toFixed(2).replace('.', ',')}% {comparisonLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
