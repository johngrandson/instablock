import { browser } from '#imports';
import type { Browser } from 'wxt/browser';
import { recordOutcome, startCampaign, type Campaign } from './campaign';
import { campaignStore } from './campaign-store';
import { isCommand, type Reply } from './messages';
import { PACING, pickMs } from './pacing';

// Storage has no compare-and-swap. All writers go through this short-lived queue.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation);
  queue = next.catch(() => {});
  return next;
}

const profileUrl = (target: string) => `https://www.instagram.com/${target}/`;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Falha ao atualizar a campanha.';

async function readCampaign() {
  const campaign = await campaignStore.getValue();
  if (campaign.status === 'running' && !campaign.run) {
    campaign.status = 'stopped';
    await campaignStore.setValue(campaign);
  }
  return campaign;
}

async function navigate(campaign: Campaign) {
  try {
    await browser.tabs.update(campaign.run!.tabId, { url: profileUrl(campaign.pending[0]!) });
  } catch (error) {
    await campaignStore.setValue({ ...campaign, status: 'stopped' });
    throw error;
  }
}

export function handleCommand(message: unknown, sender: Browser.runtime.MessageSender): Promise<Reply> {
  return serialize(async (): Promise<Reply> => {
    try {
      if (sender.id !== browser.runtime.id || !isCommand(message)) throw new Error('Comando inválido.');
      const popup = sender.url === browser.runtime.getURL('/popup.html') && !sender.tab;
      const content = sender.frameId === 0 && !!sender.documentId && !!sender.tab &&
        !!sender.url && new URL(sender.url).origin === 'https://www.instagram.com';
      if ((message.type === 'start' || message.type === 'stop') ? !popup : !content) throw new Error('Origem do comando inválida.');
      let campaign = await readCampaign();

      if (message.type === 'start') {
        if (campaign.status === 'running') throw new Error('Pare a campanha atual antes de iniciar outra.');
        try {
          const response = await browser.tabs.sendMessage(message.tabId, { type: 'probe' }, { frameId: 0 });
          if (response?.ready !== true) throw new Error();
        } catch {
          throw new Error('Abra uma aba do Instagram e recarregue-a antes de iniciar.');
        }
        campaign = {
          ...startCampaign(message.action, message.targets),
          run: { id: crypto.randomUUID(), tabId: message.tabId, phase: 'navigate', readyAt: 0 },
        };
        await campaignStore.setValue(campaign);
        await navigate(campaign);
        return { ok: true, campaign };
      }

      const run = campaign.run;
      if (message.type === 'stop') {
        if (run?.id !== message.runId) throw new Error('A campanha mudou. Abra o popup novamente.');
        if (campaign.status === 'running') {
          campaign = { ...campaign, status: 'stopped' };
          await campaignStore.setValue(campaign);
        }
        return { ok: true, campaign };
      }

      if (!run || run.tabId !== sender.tab?.id) return { ok: true };
      if (message.type === 'claim') {
        if (campaign.status !== 'running') return { ok: true };
        if (run.documentId === sender.documentId) return { ok: true };
        if (run.phase !== 'navigate' || sender.url !== profileUrl(campaign.pending[0]!)) {
          campaign = { ...campaign, status: 'stopped' };
          await campaignStore.setValue(campaign);
          return { ok: true };
        }
        campaign = { ...campaign, run: { ...run, phase: 'acting', documentId: sender.documentId } };
      } else {
        if (run.id !== message.runId || run.documentId !== sender.documentId) return { ok: true };
        if (message.type === 'result') {
          if (run.phase !== 'acting' || !['running', 'stopped'].includes(campaign.status) || message.outcome.target !== campaign.pending[0]) return { ok: true };
          campaign = recordOutcome(campaign, message.outcome);
          const pause = campaign.outcomes.length % PACING.longPauseEvery === 0 ? pickMs(PACING.longPause) : 0;
          campaign.run = { ...run, phase: 'waiting', readyAt: Date.now() + pickMs(PACING.betweenTargets) + pause };
        } else {
          if (campaign.status !== 'running' || run.phase !== 'waiting' || Date.now() < run.readyAt) return { ok: true };
          campaign = { ...campaign, run: { ...run, phase: 'navigate', documentId: undefined } };
          await campaignStore.setValue(campaign);
          await navigate(campaign);
          return { ok: true, campaign };
        }
      }
      await campaignStore.setValue(campaign);
      return { ok: true, campaign };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  });
}

export function stopCampaignForTab(tabId?: number) {
  return serialize(async () => {
    const campaign = await readCampaign();
    if (campaign.status === 'running' && (tabId === undefined || campaign.run?.tabId === tabId)) {
      await campaignStore.setValue({ ...campaign, status: 'stopped' });
    }
  });
}
