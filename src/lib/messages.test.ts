import { expect, it } from 'vitest';
import { isCommand } from './messages';

it('validates every command crossing the extension message boundary', () => {
  expect(isCommand({ type: 'start', action: 'block', tabId: 1, targets: ['alice'] })).toBe(true);
  for (const value of [null, {}, { type: 'start', action: 'block', tabId: -1, targets: ['alice'] },
    { type: 'start', action: 'block', tabId: 1, targets: ['alice', 'alice'] },
    { type: 'stop', runId: '' }, { type: 'result', runId: 'a', outcome: { target: 'alice', result: 'deleted' } },
    { type: 'result', runId: 'a', outcome: { target: 'alice', result: ['failed'] } },
    { type: 'result', runId: 'a', outcome: { target: 'alice', result: 'done', reason: 5 } }]) expect(isCommand(value)).toBe(false);
});
