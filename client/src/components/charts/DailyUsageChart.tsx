'use client';

import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { TimeSeriesPoint } from '@/types';
import { formatCurrency, formatKwhCompact } from '@/lib/formatters';

export function DailyUsageChart({ data }: { data: TimeSeriesPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-slate-400">
        No daily usage data available for the selected range.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dailyKwhGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: string) => (v.length >= 10 ? v.slice(5, 10) : v)}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: number) => `${v}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#f59e0b' }}
            tickFormatter={(v: number) => `$${v}`}
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
              if (name === 'Est. Cost ($)') return [formatCurrency(value), name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="kwh"
            name="Consumption (kWh)"
            stroke="#10b981"
            strokeWidth={2.2}
            fill="url(#dailyKwhGrad)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cost"
            name="Est. Cost ($)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 2.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
