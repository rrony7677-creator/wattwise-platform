'use client';

import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TimeSeriesPoint } from '@/types';
import { formatCarbon, formatCurrency } from '@/lib/formatters';

export function CostCarbonTrendChart({ data }: { data: TimeSeriesPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-slate-400">
        No cost and carbon trend data available.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: string) => (v.length >= 10 ? v.slice(5, 10) : v)}
          />
          <YAxis
            yAxisId="cost"
            tick={{ fontSize: 11, fill: '#f59e0b' }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <YAxis
            yAxisId="carbon"
            orientation="right"
            tick={{ fontSize: 11, fill: '#10b981' }}
            tickFormatter={(v: number) => `${v} kg`}
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
              if (name === 'Electricity Cost ($)') return [formatCurrency(value), name];
              if (name === 'Carbon Emissions (kg CO2e)') return [formatCarbon(value), name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            yAxisId="cost"
            type="monotone"
            dataKey="cost"
            name="Electricity Cost ($)"
            stroke="#f59e0b"
            strokeWidth={2.3}
            dot={{ r: 2.5 }}
          />
          <Line
            yAxisId="carbon"
            type="monotone"
            dataKey="carbonKg"
            name="Carbon Emissions (kg CO2e)"
            stroke="#10b981"
            strokeWidth={2.3}
            dot={{ r: 2.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
