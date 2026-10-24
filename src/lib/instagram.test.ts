import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { block, profileReady, unfollow, type StepContext } from './instagram';

function button(label: string, click = () => {}) {
  return {
    innerText: label, isConnected: true, getClientRects: () => [{}], getAttribute: () => null,
    querySelector: () => null, contains: () => false, matches: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 30 }),
    dispatchEvent: vi.fn((event: Event) => { if (event.type === 'click') click(); return true; }),
  };
}
let controls: ReturnType<typeof button>[];
let dialogs: { getClientRects: () => object[]; querySelectorAll: () => ReturnType<typeof button>[] }[];
let outside: ReturnType<typeof button>[];
let controller: AbortController;
let context: StepContext;
let unavailable: string;
let heading: string;

beforeEach(() => {
  vi.useFakeTimers();
  controls = []; dialogs = []; outside = []; unavailable = ''; heading = 'alice';
  controller = new AbortController();
  context = { target: 'alice', signal: controller.signal, beforeClick: vi.fn(async () => {}) };
  vi.stubGlobal('PointerEvent', Event);
  vi.stubGlobal('document', {
    querySelector: (selector: string) => selector === 'main header' ? {
      querySelectorAll: (query: string) => query === 'h1, h2' ? [{ textContent: heading }] : controls,
    } : { innerText: unavailable },
    querySelectorAll: (selector: string) => selector === '[role="dialog"]' ? dialogs : [...controls, ...outside],
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const showDialog = (...buttons: ReturnType<typeof button>[]) => { dialogs = [{ getClientRects: () => [{}], querySelectorAll: () => buttons }]; };

async function settle<T>(promise: Promise<T>, result: T) {
  const assertion = expect(promise).resolves.toEqual(result);
  await vi.runAllTimersAsync();
  await assertion;
}
async function reject(promise: Promise<unknown>, reason: string | RegExp) {
  const assertion = expect(promise).rejects.toThrow(reason);
  await vi.runAllTimersAsync();
  await assertion;
}

describe('profile-scoped Instagram actions', () => {
  it('does not accept a Follow button outside the target profile as success', async () => {
    const confirm = button('Unfollow');
    controls = [button('Following', () => showDialog(confirm))];
    outside = [button('Follow')];
    await reject(unfollow(context), 'timeout waiting for follow button on target profile');
    expect(confirm.dispatchEvent).toHaveBeenCalled();
  });

  it('only confirms unfollow after the target control changes', async () => {
    const following = button('Following', () => showDialog(button('Unfollow', () => { following.innerText = 'Follow'; })));
    controls = [following];
    await settle(unfollow(context), 'done');
  });

  it('times out instead of skipping unrecognized or wrong-profile controls', async () => {
    controls = [button('Options')]; heading = 'bob';
    await reject(profileReady(context), 'timeout waiting for profile controls');
  });

  it('skips only explicitly unavailable pages', async () => {
    unavailable = "Sorry, this page isn't available.";
    await settle(profileReady(context), false);
  });

  it('cancels before the click when stopped during the press delay', async () => {
    const following = button('Following'); controls = [following];
    const promise = unfollow(context);
    setTimeout(() => controller.abort(), 10);
    await reject(promise, /abort/i);
    expect(following.dispatchEvent.mock.calls.some(([event]) => event.type === 'click')).toBe(false);
  });

  it('cancels while waiting for a confirmation dialog', async () => {
    controls = [button('Following')];
    const promise = unfollow(context);
    setTimeout(() => controller.abort(), 500);
    await reject(promise, /abort/i);
  });

  it('requires both block dialogs and confirms in the profile', async () => {
    const confirm = button('Bloquear', () => { controls = [button('Desbloquear')]; });
    const first = button('Bloquear', () => showDialog(confirm));
    controls = [button('Opções', () => showDialog(first))];
    await settle(block(context), 'done');
  });

  it('skips already unfollowed or blocked profiles without clicking', async () => {
    controls = [button('Follow')];
    await settle(unfollow(context), 'skipped');
    controls = [button('Unblock')];
    await settle(block(context), 'skipped');
    expect(context.beforeClick).not.toHaveBeenCalled();
  });
});
