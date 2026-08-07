import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value }) => {
  return (
    <div className="bg-white border-2 border-[#DC2626] rounded-[18px] py-3.5 px-4 flex flex-col items-center justify-center text-center shadow-xs transition-all hover:shadow-md hover:border-[#B91C1C] flex-1 min-w-[170px]">
      <span className="text-gray-800 font-normal text-base leading-tight mb-1">
        {label}
      </span>
      <span className="text-[#1A1A1A] font-semibold text-lg sm:text-xl tracking-tight">
        {value}
      </span>
    </div>
  );
};
