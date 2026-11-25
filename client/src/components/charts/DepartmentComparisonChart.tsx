'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatKwhCompact } from '@/lib/formatters';

export interface DepartmentChartPoint {
  name: string;
  code?: string;
  buildingName?: string;
  kwh: number;
  cost: number;
  monthlyBudgetUsd?: number;
}

export function DepartmentComparisonChart({ data }: { data: DepartmentChartPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-slate-400">
        No department comparison data available.
      </div>
    );
  }

  const topDepts = data.slice(0, 10);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={topDepts}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={135}
            tick={{ fontSize: 10.5, fill: '#94a3b8' }}
            tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#1e293b',
              borderRadius: '10px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Consumption (kWh)') return [formatKwhCompact(value), name];
              if (name === 'Cost ($)') return [formatCurrency(value), name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            dataKey="kwh"
            name="Consumption (kWh)"
            fill="#06b6d4"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
