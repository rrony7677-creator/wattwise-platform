'use client';

import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ForecastPoint } from '@/types';
import { formatKwhCompact } from '@/lib/formatters';

export function ForecastAnomalyChart({ data }: { data: ForecastPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-slate-400">
        Insufficient historical readings to generate consumption forecast.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.04} />
            </linearGradient>
          </defs>
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
            formatter={(value: number, name: string) => [formatKwhCompact(value), name]}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area
            type="monotone"
            dataKey="upperBoundKwh"
            name="95% Confidence Upper Bound"
            stroke="none"
            fill="url(#forecastBandGrad)"
          />
          <Line
            type="monotone"
            dataKey="actualKwh"
            name="Actual Historical Usage"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecastKwh"
            name="Projected / Fitted Forecast"
            stroke="#818cf8"
            strokeWidth={2.2}
            strokeDasharray="5 4"
            dot={{ r: 2.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
