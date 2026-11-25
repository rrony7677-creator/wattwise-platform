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
import { TimeSeriesPoint } from '@/types';
import { formatCarbon, formatCurrency, formatKwhCompact } from '@/lib/formatters';

export function MonthlyUsageChart({ data }: { data: TimeSeriesPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-slate-400">
        No monthly/weekly usage data available.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
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
              if (name === 'Carbon (kg CO2e)') return [formatCarbon(value), name];
              if (name === 'Cost ($)') return [formatCurrency(value), name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            dataKey="kwh"
            name="Consumption (kWh)"
            fill="#10b981"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="carbonKg"
            name="Carbon (kg CO2e)"
            fill="#06b6d4"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
