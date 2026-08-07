import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatPercent } from '../utils/formatters';

interface ConversionChartProps {
  contatos: number;
  orcamentos: number;
  vendas: number;
}

export const ConversionChart: React.FC<ConversionChartProps> = ({
  contatos,
  orcamentos,
  vendas,
}) => {
  const rate1 = contatos > 0 ? (orcamentos / contatos) * 100 : 0;
  const rate2 = orcamentos > 0 ? (vendas / orcamentos) * 100 : 0;
  const rate3 = contatos > 0 ? (vendas / contatos) * 100 : 0;

  const data = [
    {
      name: 'Contato → Orçamento',
      rate: rate1,
      formatted: formatPercent(rate1),
    },
    {
      name: 'Orçamento → Venda',
      rate: rate2,
      formatted: formatPercent(rate2),
    },
    {
      name: 'Contato → Venda',
      rate: rate3,
      formatted: formatPercent(rate3),
    },
  ];

  // Determine max Y limit (e.g., 30% or slightly higher if rate > 30%)
  const maxRate = Math.max(rate1, rate2, rate3, 25);
  const yDomainMax = Math.ceil(maxRate / 5) * 5 + 5;

  return (
    <div className="w-full h-[260px] sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 15, right: 10, left: 0, bottom: 25 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: '#D1D5DB' }}
            tickLine={false}
            dy={8}
          />
          <YAxis
            domain={[0, yDomainMax]}
            tickFormatter={(val) => `${val.toFixed(2).replace('.', ',')}%`}
            tick={{ fill: '#4B5563', fontSize: 11 }}
            axisLine={{ stroke: '#D1D5DB' }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(220, 38, 38, 0.05)' }}
            formatter={(value: number) => [formatPercent(value), 'Taxa de Conversão']}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DC2626',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Bar
            dataKey="rate"
            fill="#DC2626"
            radius={[0, 0, 0, 0]}
            maxBarSize={55}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
