import React from 'react';
import { formatNumber } from '../utils/formatters';

interface FunnelChartProps {
  contatos: number;
  orcamentos: number;
  vendas: number;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ contatos, orcamentos, vendas }) => {
  const maxValue = Math.max(contatos, 1);

  // Calculate bar width percentage relative to max value (Contatos)
  // Ensure a minimum width for small values so label fits inside or stays visible
  const contatosWidth = 100;
  const orcamentosWidth = Math.max((orcamentos / maxValue) * 100, 12);
  const vendasWidth = Math.max((vendas / maxValue) * 100, 6);

  const stages = [
    { name: 'Contatos', count: contatos, width: contatosWidth },
    { name: 'Orçamentos', count: orcamentos, width: orcamentosWidth },
    { name: 'Vendas', count: vendas, width: vendasWidth },
  ];

  return (
    <div className="w-full flex flex-col justify-center py-4 h-full">
      <div className="flex flex-col space-y-6 w-full">
        {stages.map((stage) => (
          <div key={stage.name} className="flex items-center w-full min-h-[64px]">
            {/* Stage Label (Left side, right-aligned or left-aligned) */}
            <div className="w-28 sm:w-32 pr-4 text-right text-sm font-medium text-gray-700 select-none">
              {stage.name}
            </div>

            {/* Vertical divider line like in image */}
            <div className="w-[1px] h-16 bg-gray-200 mr-4 self-stretch" />

            {/* Bar Container - Centered Alignment like true funnel */}
            <div className="flex-1 flex justify-center items-center py-1 relative">
              <div
                className="bg-[#DC2626] transition-all duration-500 rounded-xs flex items-center justify-center text-white font-medium text-xs sm:text-sm py-3.5 shadow-2xs relative"
                style={{
                  width: `${stage.width}%`,
                  minHeight: '42px',
                }}
              >
                <span className="z-10 px-1 truncate">
                  {formatNumber(stage.count)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
