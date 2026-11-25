export function formatKwh(value: number | undefined | null, decimals = 1): string {
  const num = Number(value ?? 0);
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)} GWh`;
  }
  if (num >= 10_000) {
    return `${(num / 1_000).toFixed(2)} MWh (${num.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh)`;
  }
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kWh`;
}

export function formatKwhCompact(value: number | undefined | null): string {
  const num = Number(value ?? 0);
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kWh`;
}

export function formatCurrency(value: number | undefined | null, currency = 'USD'): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCarbon(kgValue: number | undefined | null): string {
  const num = Number(kgValue ?? 0);
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)} tCO₂e`;
  }
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg CO₂e`;
}

export function formatPercent(value: number | undefined | null, includeSign = true): string {
  const num = Number(value ?? 0);
  const sign = includeSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

export function formatDateTime(isoString: string | Date | undefined | null): string {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(isoString: string | Date | undefined | null): string {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatRoleLabel(role: string): string {
  switch (role) {
    case 'org_admin':
      return 'Organization Admin';
    case 'facility_manager':
      return 'Facility Manager';
    case 'department_manager':
      return 'Department Manager';
    case 'viewer':
      return 'Viewer (Read-Only)';
    default:
      return role;
  }
}
