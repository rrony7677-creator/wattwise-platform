'use client';

import { useCallback, useState } from 'react';

export type DatePreset = '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

function computeDatesForPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (preset === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: start.toISOString().slice(0, 10), endDate: todayStr };
  }

  if (preset === 'this_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { startDate: start.toISOString().slice(0, 10), endDate: todayStr };
  }

  if (preset === 'last_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  // Default 30d
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startDate: start.toISOString().slice(0, 10), endDate: todayStr };
}

export function useFilterState(initialPreset: DatePreset = '30d') {
  const initialDates = computeDatesForPreset(initialPreset);
  const [preset, setPresetState] = useState<DatePreset>(initialPreset);
  const [startDate, setStartDateState] = useState<string>(initialDates.startDate);
  const [endDate, setEndDateState] = useState<string>(initialDates.endDate);
  const [buildingId, setBuildingId] = useState<string>('');
  const [floorId, setFloorId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [meterId, setMeterId] = useState<string>('');

  const applyPreset = useCallback((nextPreset: DatePreset) => {
    setPresetState(nextPreset);
    if (nextPreset !== 'custom') {
      const { startDate: s, endDate: e } = computeDatesForPreset(nextPreset);
      setStartDateState(s);
      setEndDateState(e);
    }
  }, []);

  const setStartDate = useCallback((val: string) => {
    setPresetState('custom');
    setStartDateState(val);
  }, []);

  const setEndDate = useCallback((val: string) => {
    setPresetState('custom');
    setEndDateState(val);
  }, []);

  const resetFilters = useCallback(() => {
    const def = computeDatesForPreset('30d');
    setPresetState('30d');
    setStartDateState(def.startDate);
    setEndDateState(def.endDate);
    setBuildingId('');
    setFloorId('');
    setDepartmentId('');
    setMeterId('');
  }, []);

  return {
    preset,
    startDate,
    endDate,
    buildingId,
    floorId,
    departmentId,
    meterId,
    applyPreset,
    setStartDate,
    setEndDate,
    setBuildingId,
    setFloorId,
    setDepartmentId,
    setMeterId,
    resetFilters,
  };
}
