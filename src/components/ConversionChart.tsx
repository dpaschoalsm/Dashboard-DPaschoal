import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { PeriodData } from '../types';
import { formatPercent } from '../utils/formatters';

interface ConversionChartProps {
  periods: PeriodData[];
}

export const ConversionChart: React.FC<ConversionChartProps> = ({ periods }) => {
  const data = periods.map((p) => {
    let rate1 = p.contatoParaOrcamento !== undefined
      ? p.contatoParaOrcamento
      : p.contatos > 0 ? (p.orcamentos / p.contatos) * 100 : 0;
    if (Math.abs(rate1) <= 1.0 && rate1 !== 0) rate1 *= 100;

    let rate2 = p.orcamentoParaVenda !== undefined
      ? p.orcamentoParaVenda
      : p.orcamentos > 0 ? (p.vendas / p.orcamentos) * 100 : 0;
    if (Math.abs(rate2) <= 1.0 && rate2 !== 0) rate2 *= 100;

    let rate3 = p.contatoParaVenda !== undefined
      ? p.contatoParaVenda
      : p.contatos > 0 ? (p.vendas / p.contatos) * 100 : 0;
    if (Math.abs(rate3) <= 1.0 && rate3 !== 0) rate3 *= 100;

    return {
      name: p.data,
      'Contato → Orçamento': parseFloat(rate1.toFixed(2)),
      'Orçamento → Venda': parseFloat(rate2.toFixed(2)),
      'Contato → Venda': parseFloat(rate3.toFixed(2)),
    };
  });

  // Calculate maximum rate for domain
  const maxVal = Math.max(
    ...data.flatMap((d) => [
      d['Contato → Orçamento'],
      d['Orçamento → Venda'],
      d['Contato → Venda'],
    ]),
    30
  );

  const yMax = Math.ceil((maxVal + 10) / 20) * 20;

  return (
    <div className="w-full flex flex-col justify-center">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">
        Taxas de Conversão por Período
      </h3>
      <div className="w-full h-[260px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: 10, bottom: 25 }}
            barGap={4}
            barCategoryGap="20%"
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
              domain={[0, yMax]}
              tickFormatter={(val) => `${val.toFixed(0)}%`}
              tick={{ fill: '#4B5563', fontSize: 11 }}
              axisLine={{ stroke: '#D1D5DB' }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(220, 38, 38, 0.05)' }}
              formatter={(value: number, name: string) => [formatPercent(value), name]}
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
              wrapperStyle={{ paddingTop: '16px', fontSize: '11px' }}
            />
            {/* Red accent for Contato -> Orçamento */}
            <Bar
              dataKey="Contato → Orçamento"
              fill="#DC2626"
              maxBarSize={40}
              radius={[2, 2, 0, 0]}
            />
            {/* Blue accent for Orçamento -> Venda */}
            <Bar
              dataKey="Orçamento → Venda"
              fill="#0284C7"
              maxBarSize={40}
              radius={[2, 2, 0, 0]}
            />
            {/* Green accent for Contato -> Venda */}
            <Bar
              dataKey="Contato → Venda"
              fill="#16A34A"
              maxBarSize={40}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
