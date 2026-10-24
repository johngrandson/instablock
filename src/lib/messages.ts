import { browser } from '#imports';
import { isUsername, type Action, type Campaign, type Outcome } from './campaign';

export type Command =
  | { type: 'start'; tabId: number; action: Action; targets: string[] }
  | { type: 'stop'; runId: string }
  | { type: 'claim' }
  | { type: 'result'; runId: string; outcome: Outcome }
  | { type: 'advance'; runId: string };
export type Reply = { ok: true; campaign?: Campaign } | { ok: false; error: string };

export function isCommand(value: unknown): value is Command {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (message.type === 'claim') return true;
  if (message.type === 'start') return Number.isInteger(message.tabId) && Number(message.tabId) >= 0 &&
    (message.action === 'block' || message.action === 'unfollow') && Array.isArray(message.targets) &&
    message.targets.length > 0 && message.targets.every(isUsername) && new Set(message.targets).size === message.targets.length;
  if (typeof message.runId !== 'string' || !message.runId) return false;
  if (message.type === 'stop' || message.type === 'advance') return true;
  if (message.type !== 'result' || !message.outcome || typeof message.outcome !== 'object') return false;
  const outcome = message.outcome as Record<string, unknown>;
  return isUsername(outcome.target) && ['done', 'skipped', 'failed'].includes(String(outcome.result)) &&
    (outcome.reason === undefined || (typeof outcome.reason === 'string' && outcome.reason.length <= 200));
}

export async function sendCommand(command: Command): Promise<Campaign | undefined> {
  const reply: Reply | undefined = await browser.runtime.sendMessage(command);
  if (!reply) throw new Error('A extensão não respondeu. Recarregue a aba do Instagram.');
  if (!reply.ok) throw new Error(reply.error);
  return reply.campaign;
}
