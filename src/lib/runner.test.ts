import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recordOutcome, startCampaign, type Campaign } from './campaign';
import { sleep } from './pacing';

const mocks = vi.hoisted(() => ({ getValue: vi.fn(), watch: vi.fn(), send: vi.fn(), ready: vi.fn(), dwell: vi.fn(), unfollow: vi.fn(), block: vi.fn() }));
vi.mock('./campaign-store', () => ({ campaignStore: { getValue: mocks.getValue, watch: mocks.watch } }));
vi.mock('./messages', () => ({ sendCommand: mocks.send }));
vi.mock('./instagram', () => ({ profileReady: mocks.ready, dwell: mocks.dwell, unfollow: mocks.unfollow, block: mocks.block }));
import { step } from './runner';

let saved: Campaign;
let update: (value: Campaign) => void;
const unwatch = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 0, 10, 12));
  vi.stubGlobal('location', { pathname: '/alice/' });
  saved = { ...startCampaign('unfollow', ['alice', 'bob']), run: { id: 'run-a', tabId: 1, documentId: 'doc-a', phase: 'acting', readyAt: 0 } };
  mocks.watch.mockImplementation((callback) => { update = callback; return unwatch; });
  mocks.getValue.mockImplementation(async () => structuredClone(saved));
  mocks.ready.mockResolvedValue(true);
  mocks.dwell.mockImplementation(async (signal: AbortSignal) => sleep(100, signal));
  mocks.unfollow.mockResolvedValue('done'); mocks.block.mockResolvedValue('done');
  mocks.send.mockImplementation(async (command) => {
    if (command.type === 'claim') return structuredClone(saved);
    if (command.type === 'result') {
      saved = recordOutcome(saved, command.outcome);
      saved.run = { ...saved.run!, phase: 'waiting', readyAt: Date.now() + 1000 };
      return structuredClone(saved);
    }
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('does not act after a stop during dwell and releases its watcher', async () => {
  const pending = step(new AbortController());
  setTimeout(() => { saved.status = 'stopped'; update(saved); }, 50);
  await vi.runAllTimersAsync(); await pending;
  expect(mocks.unfollow).not.toHaveBeenCalled();
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(unwatch).toHaveBeenCalledOnce();
});

it('aborts an old run when another campaign replaces it', async () => {
  const pending = step(new AbortController());
  setTimeout(() => { saved.run!.id = 'run-b'; update(saved); }, 50);
  await vi.runAllTimersAsync(); await pending;
  expect(mocks.unfollow).not.toHaveBeenCalled();
  expect(mocks.send).toHaveBeenCalledTimes(1);
});

it('records timeout as a failure and leaves the target pending', async () => {
  mocks.ready.mockRejectedValue(new Error('timeout waiting for profile controls'));
  const pending = step(new AbortController());
  await vi.runAllTimersAsync(); await pending;
  expect(saved.status).toBe('failed');
  expect(saved.pending).toEqual(['alice', 'bob']);
  expect(mocks.unfollow).not.toHaveBeenCalled();
});

it('does not navigate after a stop between targets', async () => {
  const pending = step(new AbortController());
  setTimeout(() => { saved.status = 'stopped'; update(saved); }, 200);
  await vi.runAllTimersAsync(); await pending;
  expect(mocks.unfollow).toHaveBeenCalledOnce();
  expect(mocks.send.mock.calls.map(([message]) => message.type)).toEqual(['claim', 'result']);
});

it.each([0, 3, 12, 23])('runs at %i:00 using the original action and only the inter-target delay', async (hour) => {
  vi.setSystemTime(new Date(2026, 0, 10, hour));
  const started = Date.now();
  const pending = step(new AbortController());
  await vi.runAllTimersAsync(); await pending;
  expect(mocks.unfollow).toHaveBeenCalledOnce();
  expect(mocks.block).not.toHaveBeenCalled();
  expect(mocks.send.mock.calls.map(([message]) => message.type)).toEqual(['claim', 'result', 'advance']);
  expect(Date.now() - started).toBe(1100);
});
