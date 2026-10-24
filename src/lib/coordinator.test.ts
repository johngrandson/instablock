import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Browser } from 'wxt/browser';
import { EMPTY, startCampaign, type Campaign } from './campaign';

const { store, browser } = vi.hoisted(() => ({
  store: { getValue: vi.fn(), setValue: vi.fn() },
  browser: {
    runtime: { id: 'extension', getURL: (path: string) => `chrome-extension://extension/${path.replace(/^\//, '')}` },
    tabs: { sendMessage: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('wxt/browser', () => ({ browser }));
vi.mock('./campaign-store', () => ({ campaignStore: store }));
import { handleCommand, stopCampaignForTab } from './coordinator';

let saved: Campaign;
const popup = { id: 'extension', url: 'chrome-extension://extension/popup.html' };
const content = (documentId = 'doc-a', target = 'alice', tabId = 1) => ({
  id: 'extension', frameId: 0, documentId, tab: { id: tabId }, url: `https://www.instagram.com/${target}/`,
}) as Browser.runtime.MessageSender;
const start = (targets = ['alice', 'bob']) => handleCommand({ type: 'start', tabId: 1, action: 'unfollow', targets }, popup);
const claim = () => handleCommand({ type: 'claim' }, content());

beforeEach(() => {
  vi.clearAllMocks();
  saved = structuredClone(EMPTY);
  store.getValue.mockImplementation(async () => structuredClone(saved));
  store.setValue.mockImplementation(async (value: Campaign) => { saved = structuredClone(value); });
  browser.tabs.sendMessage.mockResolvedValue({ ready: true });
  browser.tabs.update.mockResolvedValue({ id: 1 });
});

describe('single campaign coordinator', () => {
  it('starts one campaign when two starts race', async () => {
    const replies = await Promise.all([start(), start(['carol'])]);
    expect(replies.map((reply) => reply.ok)).toEqual([true, false]);
    expect(saved.pending).toEqual(['alice', 'bob']);
    expect(browser.tabs.update).toHaveBeenCalledExactlyOnceWith(1, { url: 'https://www.instagram.com/alice/' });
  });

  it('rejects invalid actions, targets and senders without writing', async () => {
    for (const action of ['delete', null]) expect((await handleCommand({ type: 'start', tabId: 1, action, targets: ['alice'] }, popup)).ok).toBe(false);
    expect((await handleCommand({ type: 'start', tabId: 1, action: 'block', targets: ['../alice'] }, popup)).ok).toBe(false);
    expect((await handleCommand({ type: 'start', tabId: 1, action: 'block', targets: ['alice'] }, content())).ok).toBe(false);
    expect((await handleCommand({ type: 'claim' }, { ...content(), id: 'another-extension' })).ok).toBe(false);
    expect(store.setValue).not.toHaveBeenCalled();
  });

  it('does not replace the previous campaign when the tab cannot receive commands', async () => {
    saved = { ...startCampaign('unfollow', ['pending']), status: 'stopped' };
    browser.tabs.sendMessage.mockRejectedValue(new Error('no listener'));
    expect((await start()).ok).toBe(false);
    expect(saved.pending).toEqual(['pending']);
    expect(browser.tabs.update).not.toHaveBeenCalled();
  });

  it('only lets the owning tab claim the expected profile once', async () => {
    await start();
    expect(await handleCommand({ type: 'claim' }, content('other-doc', 'alice', 2))).toEqual({ ok: true });
    const reply = await claim();
    expect(reply.ok && reply.campaign?.run?.documentId).toBe('doc-a');
    expect(await claim()).toEqual({ ok: true });
  });

  it('stops on reload or unexpected navigation without consuming the target', async () => {
    await start();
    await claim();
    await handleCommand({ type: 'claim' }, content('reloaded'));
    expect(saved.status).toBe('stopped');
    expect(saved.pending).toEqual(['alice', 'bob']);
    await start();
    await handleCommand({ type: 'claim' }, content('login', 'accounts/login'));
    expect(saved.status).toBe('stopped');
  });

  it('keeps stop while recording an action that was already sent', async () => {
    await start();
    await claim();
    const runId = saved.run!.id;
    await handleCommand({ type: 'stop', runId }, popup);
    await handleCommand({ type: 'result', runId, outcome: { target: 'alice', result: 'done' } }, content());
    expect(saved.status).toBe('stopped');
    expect(saved.pending).toEqual(['bob']);
    await handleCommand({ type: 'advance', runId }, content());
    expect(browser.tabs.update).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale result and stop after another campaign starts', async () => {
    await start();
    await claim();
    const runId = saved.run!.id;
    await handleCommand({ type: 'stop', runId }, popup);
    await start(['carol', 'dave']);
    await handleCommand({ type: 'result', runId, outcome: { target: 'alice', result: 'done' } }, content());
    expect((await handleCommand({ type: 'stop', runId }, popup)).ok).toBe(false);
    expect(saved.pending).toEqual(['carol', 'dave']);
    expect(saved.outcomes).toEqual([]);
    expect(saved.status).toBe('running');
  });

  it('rejects results from another document or for another target', async () => {
    await start(); await claim();
    const runId = saved.run!.id;
    await handleCommand({ type: 'result', runId, outcome: { target: 'alice', result: 'done' } }, content('other'));
    await handleCommand({ type: 'result', runId, outcome: { target: 'bob', result: 'done' } }, content());
    expect(saved.outcomes).toEqual([]);
  });

  it('records once and enforces the persisted delay before advancing', async () => {
    await start(); await claim();
    const runId = saved.run!.id;
    const result = { type: 'result', runId, outcome: { target: 'alice', result: 'done' } };
    await handleCommand(result, content());
    await handleCommand(result, content());
    expect(saved.outcomes).toHaveLength(1);
    expect(saved.run!.readyAt).toBeGreaterThan(Date.now());
    await handleCommand({ type: 'advance', runId }, content());
    expect(browser.tabs.update).toHaveBeenCalledTimes(1);
    saved.run!.readyAt = 0;
    await handleCommand({ type: 'advance', runId }, content());
    await handleCommand({ type: 'advance', runId }, content());
    expect(browser.tabs.update).toHaveBeenCalledTimes(2);
    expect(saved.run!.documentId).toBeUndefined();
    const reply = await handleCommand({ type: 'claim' }, content('doc-b', 'bob'));
    expect(reply.ok && reply.campaign?.run?.documentId).toBe('doc-b');
  });

  it('migrates legacy running data without losing action or targets', async () => {
    saved = startCampaign('unfollow', ['alice']);
    await handleCommand({ type: 'claim' }, content());
    expect(saved).toEqual({ ...startCampaign('unfollow', ['alice']), status: 'stopped' });
  });

  it('stops only the owning tab, or any campaign on browser startup', async () => {
    await start();
    await stopCampaignForTab(2);
    expect(saved.status).toBe('running');
    await stopCampaignForTab(1);
    expect(saved.status).toBe('stopped');
    await start();
    await stopCampaignForTab();
    expect(saved.status).toBe('stopped');
  });

  it('stops and reports a navigation failure', async () => {
    browser.tabs.update.mockRejectedValue(new Error('tab closed'));
    expect((await start()).ok).toBe(false);
    expect(saved.status).toBe('stopped');
  });
});
