// Effects: one page load of the runner tab processes one target.
import { recordOutcome, startCampaign, type Action, type Outcome } from './campaign';
import { campaignStore } from './campaign-store';
import { block, dwell, profileReady, unfollow } from './instagram';
import { PACING, msUntilActiveHours, sleep, wait } from './pacing';

export type StartCommand = { action: Action; targets: string[] };

const RUNNER_MARK = 'instablock';
const PERFORM = { unfollow, block };

const profilePath = (username: string) => `/${username}/`;
const isRunnerTab = () => sessionStorage.getItem(RUNNER_MARK) === '1';
const release = () => sessionStorage.removeItem(RUNNER_MARK);

export async function start({ action, targets }: StartCommand) {
  const [first] = targets;
  if (!first) return;
  await campaignStore.setValue(startCampaign(action, targets));
  sessionStorage.setItem(RUNNER_MARK, '1');
  location.href = profilePath(first);
}

async function attempt(target: string, action: Action): Promise<Outcome> {
  // A redirect (login, checkpoint) means Instagram is not showing the profile.
  if (location.pathname !== profilePath(target)) return { target, result: 'failed', reason: 'redirected' };
  try {
    if (!(await profileReady())) return { target, result: 'skipped', reason: 'unavailable' };
    await dwell();
    return { target, result: await PERFORM[action]() };
  } catch (error) {
    return { target, result: 'failed', reason: (error as Error).message };
  }
}

export async function step() {
  if (!isRunnerTab()) return;
  const campaign = await campaignStore.getValue();
  const [target] = campaign.pending;
  if (campaign.status !== 'running' || !target) return release();

  // Nothing runs at night. A Parar pressed during the wait is honoured.
  await sleep(msUntilActiveHours(new Date()));
  if ((await campaignStore.getValue()).status !== 'running') return release();

  const outcome = await attempt(target, campaign.action);
  // Re-read before saving: Parar may have been pressed while the target was being processed.
  const next = recordOutcome(await campaignStore.getValue(), outcome);
  await campaignStore.setValue(next);
  const [nextTarget] = next.pending;
  if (next.status !== 'running' || !nextTarget) return release();

  await wait(PACING.betweenTargets);
  if (next.outcomes.length % PACING.longPauseEvery === 0) await wait(PACING.longPause);
  if ((await campaignStore.getValue()).status !== 'running') return release();
  location.href = profilePath(nextTarget);
}
