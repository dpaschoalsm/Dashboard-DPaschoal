import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PeriodData } from '../types';
import { formatCurrency } from '../utils/formatters';

interface FinancialComboChartProps {
  periods: PeriodData[];
}

export const FinancialComboChart: React.FC<FinancialComboChartProps> = ({ periods }) => {
  const chartData = periods.map((p) => ({
    name: p.data,
    faturamento: p.faturamento,
    lucroBruto: p.lucroBruto,
  }));

  // Find min & max for nicer domain padding
  const allFat = periods.map((p) => p.faturamento);
  const allLucro = periods.map((p) => p.lucroBruto);

  const minFat = Math.min(...allFat, 300000);
  const maxFat = Math.max(...allFat, 350000);

  const minLucro = Math.min(...allLucro, 100000);
  const maxLucro = Math.max(...allLucro, 125000);

  return (
    <div className="w-full h-full flex flex-col justify-center">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center sm:text-left">
        Faturamento x Lucro Bruto por Período
      </h3>
      <div className="w-full h-[240px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 10, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: '#D1D5DB' }}
              tickLine={false}
              dy={8}
            />
            {/* Left YAxis for Faturamento */}
            <YAxis
              yAxisId="fat"
              orientation="left"
              domain={[Math.floor(minFat * 0.95), Math.ceil(maxFat * 1.02)]}
              tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`}
              tick={{ fill: '#1E3A8A', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            {/* Right YAxis for Lucro Bruto */}
            <YAxis
              yAxisId="lucro"
              orientation="right"
              domain={[Math.floor(minLucro * 0.92), Math.ceil(maxLucro * 1.05)]}
              tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`}
              tick={{ fill: '#DC2626', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'faturamento' ? 'Faturamento' : 'Lucro Bruto',
              ]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DC2626',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
              formatter={(value) => (value === 'faturamento' ? 'Faturamento' : 'Lucro Bruto')}
            />
            <Bar
              yAxisId="fat"
              dataKey="faturamento"
              fill="#1E40AF"
              maxBarSize={48}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="lucro"
              type="monotone"
              dataKey="lucroBruto"
              stroke="#DC2626"
              strokeWidth={3}
              dot={{ r: 5, fill: '#DC2626', strokeWidth: 2, stroke: '#FFFFFF' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
