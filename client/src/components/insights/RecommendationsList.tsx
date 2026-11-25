'use client';

import React from 'react';
import { Lightbulb, Sparkles, TrendingDown } from 'lucide-react';
import { EnergyRecommendation } from '@/types';
import { formatCarbon, formatCurrency, formatKwhCompact } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui';

export function RecommendationsList({
  recommendations,
}: {
  recommendations: EnergyRecommendation[];
}) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No energy-saving recommendations generated for this filter selection.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all hover:border-emerald-500/40 dark:border-slate-800 dark:bg-slate-800/40"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                <Sparkles className="h-3 w-3" />
                {rec.category}
              </span>
              <StatusBadge
                status={`${rec.severity.toUpperCase()} PRIORITY`}
                variant={
                  rec.severity === 'high'
                    ? 'danger'
                    : rec.severity === 'medium'
                    ? 'warning'
                    : 'info'
                }
              />
            </div>

            <h4 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
              {rec.title}
            </h4>
            <p className="mt-0.5 text-[11px] font-medium text-cyan-500">
              Target Scope: {rec.targetEntityName}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {rec.description}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-center dark:border-slate-700/70 dark:bg-slate-900/80">
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Monthly Energy</p>
              <p className="mt-0.5 text-xs font-bold text-emerald-500">
                -{formatKwhCompact(rec.estimatedMonthlySavingsKwh)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Cost Savings</p>
              <p className="mt-0.5 text-xs font-bold text-amber-500">
                {formatCurrency(rec.estimatedMonthlySavingsUsd)}/mo
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase">CO₂ Reduction</p>
              <p className="mt-0.5 text-xs font-bold text-cyan-500">
                -{formatCarbon(rec.estimatedCarbonReductionKg)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
