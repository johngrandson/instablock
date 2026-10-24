import { describe, expect, it } from 'vitest';
import { SESSION_CAP, parseInput, parseUsernames, recordOutcome, startCampaign, type Campaign } from './campaign';

describe('recordOutcome', () => {
  const campaign = startCampaign('block', ['a', 'b']);

  it('drops the head and keeps running while targets remain', () => {
    const next = recordOutcome(campaign, { target: 'a', result: 'done' });
    expect(next.status).toBe('running');
    expect(next.pending).toEqual(['b']);
    expect(next.outcomes).toHaveLength(1);
  });

  it('finishes when the last target is processed', () => {
    const afterA = recordOutcome(campaign, { target: 'a', result: 'done' });
    const afterB = recordOutcome(afterA, { target: 'b', result: 'skipped' });
    expect(afterB.status).toBe('finished');
    expect(afterB.pending).toEqual([]);
  });

  it('halts on failure and keeps the failed target at the head', () => {
    const next = recordOutcome(campaign, { target: 'a', result: 'failed', reason: 'timeout' });
    expect(next.status).toBe('failed');
    expect(next.pending).toEqual(['a', 'b']);
  });

  it('keeps a stop requested while the target was being processed', () => {
    const stopped = { ...campaign, status: 'stopped' as const };
    expect(recordOutcome(stopped, { target: 'a', result: 'done' }).status).toBe('stopped');
  });
});

describe('session cap', () => {
  const targets = (count: number) => Array.from({ length: count }, (_, i) => `user${i}`);
  const processDone = (campaign: Campaign, count: number): Campaign =>
    Array.from({ length: count }).reduce<Campaign>(
      (current) => recordOutcome(current, { target: current.pending[0] ?? '', result: 'done' }),
      campaign,
    );

  it('caps a running campaign when targets remain', () => {
    const capped = processDone(startCampaign('unfollow', targets(SESSION_CAP + 1)), SESSION_CAP);
    expect(capped.status).toBe('capped');
    expect(capped.pending).toEqual([`user${SESSION_CAP}`]);
  });

  it('finishes instead of capping when nothing remains', () => {
    expect(processDone(startCampaign('unfollow', targets(SESSION_CAP)), SESSION_CAP).status).toBe('finished');
  });

  it('fails instead of capping on a failed outcome at the cap', () => {
    const almost = processDone(startCampaign('unfollow', targets(SESSION_CAP + 1)), SESSION_CAP - 1);
    const failed = recordOutcome(almost, { target: almost.pending[0] ?? '', result: 'failed', reason: 'timeout' });
    expect(failed.status).toBe('failed');
    expect(failed.pending).toHaveLength(2);
  });
});

describe('parseInput', () => {
  it('accepts line breaks, spaces, tabs and commas as separators', () => {
    expect(parseUsernames('alice\nbob carol,dave\tERIN,, frank')).toEqual(['alice', 'bob', 'carol', 'dave', 'erin', 'frank']);
    expect(parseUsernames('alice, bob ,carol')).toEqual(['alice', 'bob', 'carol']);
  });

  it('ignores tokens that cannot be a username and reports them', () => {
    const { targets, ignored } = parseInput('alice joão maria! @bob https://example.com/x\n' + 'x'.repeat(31));
    expect(targets).toEqual(['alice', 'bob']);
    expect(ignored).toEqual(['joão', 'maria!', 'https://example.com/x', 'x'.repeat(31)]);
  });
});

describe('parseUsernames', () => {
  it('normalises handles and URLs and dedupes', () => {
    const text = 'alice\n@Bob\nhttps://www.instagram.com/carol/?hl=en\ninstagram.com/dave\n\nalice, eve';
    expect(parseUsernames(text)).toEqual(['alice', 'bob', 'carol', 'dave', 'eve']);
  });

  it('returns nothing for blank input', () => {
    expect(parseUsernames('  \n')).toEqual([]);
  });
});
