import type { Campaign, Outcome } from './campaign';
import { campaignStore } from './campaign-store';
import { block, dwell, profileReady, unfollow, type StepContext } from './instagram';
import { sendCommand } from './messages';
import { sleep } from './pacing';

const PERFORM = { unfollow, block };

export async function step(controller: AbortController) {
  const campaign = await sendCommand({ type: 'claim' });
  const run = campaign?.run;
  const target = campaign?.pending[0];
  if (!campaign || !run || !target) return;
  const { signal } = controller;
  const current = (value: Campaign | null) => value?.status === 'running' && value.run?.id === run.id && value.run.documentId === run.documentId;
  const unwatch = campaignStore.watch((value) => { if (!current(value)) controller.abort(); });
  const context: StepContext = {
    target, signal,
    beforeClick: async () => {
      signal.throwIfAborted();
      if (!current(await campaignStore.getValue())) controller.abort();
      signal.throwIfAborted();
      if (location.pathname !== `/${target}/`) throw new Error('redirected');
    },
  };
  try {
    let outcome: Outcome;
    try {
      await context.beforeClick();
      if (!(await profileReady(context))) outcome = { target, result: 'skipped', reason: 'unavailable' };
      else {
        await dwell(signal);
        outcome = { target, result: await PERFORM[campaign.action](context) };
      }
    } catch (error) {
      if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
      outcome = { target, result: 'failed', reason: (error instanceof Error ? error.message : 'Falha inesperada.').slice(0, 200) };
    }
    const next = await sendCommand({ type: 'result', runId: run.id, outcome });
    if (!next || next.status !== 'running' || !next.run) return;
    await sleep(next.run.readyAt - Date.now(), signal);
    await context.beforeClick();
    await sendCommand({ type: 'advance', runId: run.id });
  } catch (error) {
    if (!signal.aborted) throw error;
  } finally {
    unwatch();
  }
}
