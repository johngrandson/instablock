import { describe, expect, it } from 'vitest';
import { estimateRemainingMs, formatDuration, msUntilActiveHours } from './pacing';

const at = (hour: number, minute = 0) => new Date(2026, 0, 10, hour, minute);
const HOUR = 3_600_000;

describe('msUntilActiveHours', () => {
  it('is zero inside the window', () => {
    expect(msUntilActiveHours(at(12))).toBe(0);
  });

  it('waits until 08:00 before the window opens', () => {
    expect(msUntilActiveHours(at(3))).toBe(5 * HOUR);
  });

  it('waits until 08:00 next day after the window closes', () => {
    expect(msUntilActiveHours(at(23, 30))).toBe(8.5 * HOUR);
  });
});

describe('estimateRemainingMs', () => {
  it('is zero with nothing pending', () => {
    expect(estimateRemainingMs(0)).toBe(0);
  });

  it('adds one long pause every ten targets', () => {
    const perTarget = 45 + 5.5 + 2 * 1.65;
    expect(estimateRemainingMs(1)).toBeCloseTo(perTarget * 1000, 5);
    expect(estimateRemainingMs(10)).toBeCloseTo((10 * perTarget + 90) * 1000, 5);
  });
});

describe('formatDuration', () => {
  it('rounds to minutes and hours', () => {
    expect(formatDuration(30_000)).toBe('< 1 min');
    expect(formatDuration(40 * 60_000)).toBe('~40 min');
    expect(formatDuration(130 * 60_000)).toBe('~2 h 10 min');
    expect(formatDuration(120 * 60_000)).toBe('~2 h');
  });
});
