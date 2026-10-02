export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-GB', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function ageLabel(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return 'no readings yet';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export function reasonLabel(reason: string) {
  return reason.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function estimateText(kind: string, minutes: number | null) {
  if (kind === 'empty' && minutes !== null) return `${formatNumber(minutes)} min`;
  if (kind === 'full' && minutes !== null) return `${formatNumber(minutes)} min`;
  return 'Not estimated';
}

export function estimateHint(kind: string) {
  if (kind === 'empty') return 'until empty at the recent rate';
  if (kind === 'full') return 'until full at the recent rate';
  return 'change over 15 minutes is too small';
}
