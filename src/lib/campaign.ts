// Pure domain: no browser, no DOM, no storage.
export type Action = 'unfollow' | 'block';
export type Status = 'idle' | 'running' | 'stopped' | 'capped' | 'finished' | 'failed';
export type Outcome = { target: string; result: 'done' | 'skipped' | 'failed'; reason?: string };
export type Run = { id: string; tabId: number; documentId?: string; phase: 'navigate' | 'acting' | 'waiting'; readyAt: number };
export type Campaign = { status: Status; action: Action; pending: string[]; outcomes: Outcome[]; run?: Run };

export const EMPTY: Campaign = { status: 'idle', action: 'unfollow', pending: [], outcomes: [] };

export const startCampaign = (action: Action, targets: string[]): Campaign => ({
  status: 'running',
  action,
  pending: targets,
  outcomes: [],
});

// A session limit, not a guarantee against Instagram restrictions.
export const SESSION_CAP = 40;

// A failed target stays at the head so a resume retries it; failure halts the campaign.
// A stop requested while the target was being processed is kept.
export function recordOutcome(campaign: Campaign, outcome: Outcome): Campaign {
  if (outcome.target !== campaign.pending[0]) return campaign;
  const outcomes = [...campaign.outcomes, outcome];
  if (outcome.result === 'failed') return { ...campaign, status: campaign.status === 'running' ? 'failed' : campaign.status, outcomes };
  const pending = campaign.pending.slice(1);
  return { ...campaign, pending, outcomes, status: nextStatus(campaign.status, pending, outcomes.length) };
}

function nextStatus(status: Status, pending: string[], processed: number): Status {
  if (status !== 'running') return status;
  if (!pending.length) return 'finished';
  if (status === 'running' && processed >= SESSION_CAP) return 'capped';
  return status;
}

// Instagram usernames: letters, digits, dot and underscore, up to 30 characters.
const USERNAME = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{1,30}$/;
const ROUTES = new Set(['accounts', 'about', 'direct', 'explore', 'p', 'reel', 'reels', 'stories', 'legal', 'developer', 'web']);
export const isUsername = (value: unknown): value is string =>
  typeof value === 'string' && USERNAME.test(value) && !ROUTES.has(value);

function usernameFromToken(token: string): string | undefined {
  let name = token.replace(/^@/, '').toLowerCase();
  if (/^(?:https?:\/\/|(?:www\.)?instagram\.com\/)/i.test(token)) {
    try {
      const url = new URL(/^https?:\/\//i.test(token) ? token : `https://${token}`);
      if (!['https:', 'http:'].includes(url.protocol) || !['instagram.com', 'www.instagram.com'].includes(url.hostname) || url.port || url.username || url.password) return;
      const match = /^\/([^/]+)\/?$/.exec(url.pathname);
      name = match?.[1]?.toLowerCase() ?? '';
    } catch {
      return;
    }
  }
  return isUsername(name) ? name : undefined;
}

// Accepts usernames, @handles or instagram.com URLs separated by newlines, spaces, tabs or commas.
// Tokens that cannot be a username are reported in `ignored` instead of becoming targets.
export function parseInput(text: string): { targets: string[]; ignored: string[] } {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  const names = tokens.map(usernameFromToken);
  const targets = [...new Set(names.filter((name): name is string => name !== undefined))];
  const ignored = tokens.filter((_, index) => names[index] === undefined);
  return { targets, ignored };
}

export const parseUsernames = (text: string) => parseInput(text).targets;
