import { describe, expect, it } from 'vitest';
import { estimateRemainingMs, formatDuration } from './pacing';

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
