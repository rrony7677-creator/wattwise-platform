'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface SimTickSummary {
  timestamp: string;
  recordsCreated: number;
  anomaliesDetected: number;
  alertsTriggered: number;
}

export const SIMULATION_TICK_EVENT = 'wattwise:simulation-tick';

export function useRealtimeSim() {
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [isTickPending, setIsTickPending] = useState(false);
  const [lastTickResult, setLastTickResult] = useState<SimTickSummary | null>(null);

  const triggerSingleTick = useCallback(async () => {
    if (isTickPending) return null;
    setIsTickPending(true);
    try {
      const res = await apiFetch<SimTickSummary>('/energy-records/simulate-tick', {
        method: 'POST',
      });
      setLastTickResult(res.data);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SIMULATION_TICK_EVENT, { detail: res.data }));
      }
      return res.data;
    } catch (error) {
      console.error('Simulation tick error:', error);
      return null;
    } finally {
      setIsTickPending(false);
    }
  }, [isTickPending]);

  useEffect(() => {
    if (!isAutoSimulating) return;
    const interval = window.setInterval(() => {
      void triggerSingleTick();
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAutoSimulating, triggerSingleTick]);

  const toggleAutoSimulate = useCallback(() => {
    setIsAutoSimulating((prev) => {
      const next = !prev;
      if (next) {
        void triggerSingleTick();
      }
      return next;
    });
  }, [triggerSingleTick]);

  return {
    isAutoSimulating,
    isTickPending,
    lastTickResult,
    triggerSingleTick,
    toggleAutoSimulate,
  };
}
