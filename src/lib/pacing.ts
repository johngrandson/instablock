// Pacing policy. Instagram enforcement is velocity- and pattern-based (no published quotas), so
// delays are wide, randomised, broken by long pauses, and nothing runs at night.
export type Range = readonly [minSeconds: number, maxSeconds: number];

export const PACING = {
  betweenTargets: [150, 330] as Range,
  dwell: [3, 8] as Range, // reading the profile before acting
  reaction: [0.8, 2.5] as Range, // reading a dialog before confirming
  longPause: [600, 1200] as Range,
  longPauseEvery: 10,
  activeHours: [8, 23] as readonly [number, number], // local time
};

export const pickMs = ([min, max]: Range) => (min + Math.random() * (max - min)) * 1000;
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, Math.max(0, ms));
    signal?.addEventListener('abort', abort, { once: true });
  });
}
export const wait = (range: Range, signal?: AbortSignal) => sleep(pickMs(range), signal);

// 0 inside the active window, otherwise ms until the next window opens.
export function msUntilActiveHours(now: Date, [start, end] = PACING.activeHours): number {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour >= start && hour < end) return 0;
  const next = new Date(now);
  if (hour >= end) next.setDate(next.getDate() + 1);
  next.setHours(start, 0, 0, 0);
  return next.getTime() - now.getTime();
}

const mid = ([min, max]: Range) => (min + max) / 2;

// Wall-clock estimate for the targets still pending, from the pacing constants above.
export function estimateRemainingMs(remaining: number): number {
  const perTarget = mid(PACING.betweenTargets) + mid(PACING.dwell) + 2 * mid(PACING.reaction);
  const longPauses = Math.floor(remaining / PACING.longPauseEvery);
  return (remaining * perTarget + longPauses * mid(PACING.longPause)) * 1000;
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return '< 1 min';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `~${hours} h ${rest} min` : `~${hours} h`;
}
