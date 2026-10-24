// Pure domain: no browser, no DOM, no storage.
export type Action = 'unfollow' | 'block';
export type Status = 'idle' | 'running' | 'stopped' | 'capped' | 'finished' | 'failed';
export type Outcome = { target: string; result: 'done' | 'skipped' | 'failed'; reason?: string };
export type Campaign = { status: Status; action: Action; pending: string[]; outcomes: Outcome[] };

export const EMPTY: Campaign = { status: 'idle', action: 'unfollow', pending: [], outcomes: [] };

export const startCampaign = (action: Action, targets: string[]): Campaign => ({
  status: 'running',
  action,
  pending: targets,
  outcomes: [],
});

// Targets processed in one campaign before it halts on its own. Vendor guides put safe daily
// volumes at 100-150 for old accounts and 20-50 for new ones; 40 keeps one run under both.
export const SESSION_CAP = 40;

// A failed target stays at the head so a resume retries it; failure halts the campaign.
// A stop requested while the target was being processed is kept.
export function recordOutcome(campaign: Campaign, outcome: Outcome): Campaign {
  const outcomes = [...campaign.outcomes, outcome];
  if (outcome.result === 'failed') return { ...campaign, status: 'failed', outcomes };
  const pending = campaign.pending.slice(1);
  return { ...campaign, pending, outcomes, status: nextStatus(campaign.status, pending, outcomes.length) };
}

function nextStatus(status: Status, pending: string[], processed: number): Status {
  if (!pending.length) return 'finished';
  if (status === 'running' && processed >= SESSION_CAP) return 'capped';
  return status;
}

// Instagram usernames: letters, digits, dot and underscore, up to 30 characters.
const USERNAME = /^[a-z0-9._]{1,30}$/;

// Accepts usernames, @handles or instagram.com URLs separated by newlines, spaces, tabs or commas.
// Tokens that cannot be a username are reported in `ignored` instead of becoming targets.
export function parseInput(text: string): { targets: string[]; ignored: string[] } {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  const names = tokens.map((token) =>
    token
      .replace(/^.*instagram\.com\//i, '')
      .replace(/^@/, '')
      .replace(/[/?].*$/, '')
      .toLowerCase(),
  );
  const targets = [...new Set(names.filter((name) => USERNAME.test(name)))];
  const ignored = tokens.filter((_, index) => !USERNAME.test(names[index] ?? ''));
  return { targets, ignored };
}

export const parseUsernames = (text: string) => parseInput(text).targets;
