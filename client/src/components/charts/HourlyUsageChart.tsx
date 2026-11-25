'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TimeSeriesPoint } from '@/types';
import { formatCurrency, formatKwhCompact } from '@/lib/formatters';

export function HourlyUsageChart({ data }: { data: TimeSeriesPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-slate-400">
        No hourly consumption data available for the selected range.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="hourlyKwhGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: string) => (v.length > 10 ? v.slice(5) : v)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: number) => `${v} kWh`}
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
              if (name === 'kwh') return [formatKwhCompact(value), 'Consumption'];
              if (name === 'cost') return [formatCurrency(value), 'Est. Cost'];
              return [value, name];
            }}
          />
          <Area
            type="monotone"
            dataKey="kwh"
            stroke="#06b6d4"
            strokeWidth={2.2}
            fill="url(#hourlyKwhGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
