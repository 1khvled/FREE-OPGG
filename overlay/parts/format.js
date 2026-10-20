/**
 * Small formatting helpers shared by the HUD sections.
 */

/** `125` -> `2:05`, `3725` -> `1:02:05`, `0` -> `0:00`. */
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** `52.83` -> `52.8%`. */
export function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number.toFixed(1)}%`;
}

/** Seconds between two epoch milliseconds, floored at zero. */
export function secondsUntil(epochMs, now) {
  return Math.max(0, Math.ceil((epochMs - now) / 1000));
}

/** Fraction (0..1) of a cooldown that is still remaining. */
export function remainingFraction(remaining, total) {
  const rest = Number(remaining);
  const full = Number(total);
  if (!Number.isFinite(rest) || !Number.isFinite(full) || full <= 0) return 0;
  return Math.min(1, Math.max(0, rest / full));
}

/** Truncate a long string for a compact HUD label. */
export function truncate(value, max) {
  const text = String(value ?? '');
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}
