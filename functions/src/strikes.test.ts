import { describe, expect, test } from 'vitest';
import type { Strike } from 'shared-types';
import {
    StrikesUntilBanned,
    noStrikes,
    strikesRemaining,
    withStrike,
} from './strikes.js';

/** Distinct per call, so the tests that repeat a strike keep testing repetition
 *  rather than tripping the decision guard. Pass one explicitly to test it. */
let decisions = 0;
function strike(project: string, time = 1, decision?: string): Strike {
    return {
        project,
        flags: ['violence'],
        moderator: 'mod',
        time,
        decision: decision ?? `decision-${++decisions}`,
    };
}

/**
 * The rule behind "after three warnings you can no longer make anything
 * public". It lives in a pure function because a person reads it as a promise —
 * the rights page states it, and each warning says which one it is — so the
 * count the creator is told and the count that bans them must be the same
 * arithmetic.
 */
describe('withStrike', () => {
    test('the first warning counts but changes nothing else', () => {
        const after = withStrike(noStrikes(), strike('p1'));
        expect(after.count).toBe(1);
        expect(after.banned).toBe(false);
        expect(after.bannedAt).toBeNull();
        expect(strikesRemaining(after)).toBe(StrikesUntilBanned - 1);
    });

    test('the third warning is the one that removes public sharing', () => {
        let record = noStrikes();
        for (let i = 1; i <= StrikesUntilBanned; i++)
            record = withStrike(record, strike(`p${i}`, i));
        expect(record.count).toBe(StrikesUntilBanned);
        expect(record.banned).toBe(true);
        expect(record.bannedAt).toBe(StrikesUntilBanned);
        expect(strikesRemaining(record)).toBe(0);
    });

    test('each decision is kept, in the order it was made', () => {
        // The record is what a reinstatement request is about, so it has to
        // say what actually happened rather than just how often.
        let record = noStrikes();
        record = withStrike(record, strike('first', 1));
        record = withStrike(record, strike('second', 2));
        expect(record.strikes.map((s) => s.project)).toEqual([
            'first',
            'second',
        ]);
    });

    test('a fourth warning does not re-date the ban', () => {
        // The date is what someone asking to share publicly again is asking
        // about; a later warning must not quietly move it.
        let record = noStrikes();
        for (let i = 1; i <= StrikesUntilBanned; i++)
            record = withStrike(record, strike(`p${i}`, i));
        const bannedAt = record.bannedAt;
        record = withStrike(record, strike('later', 99));
        expect(record.bannedAt).toBe(bannedAt);
        expect(record.count).toBe(StrikesUntilBanned + 1);
    });

    test('strikesRemaining never goes negative', () => {
        let record = noStrikes();
        for (let i = 0; i < StrikesUntilBanned + 3; i++)
            record = withStrike(record, strike('p'));
        expect(strikesRemaining(record)).toBe(0);
    });

    test('the same decision counts once, however many times it arrives', () => {
        // A submission whose response was lost is re-sent by the moderator with
        // the same id. Warning a creator twice for it would, at two warnings,
        // ban them on the next one they actually earned.
        const again = strike('p1', 1, 'same');
        let record = withStrike(noStrikes(), again);
        record = withStrike(record, again);
        record = withStrike(record, again);
        expect(record.count).toBe(1);
        expect(record.strikes).toHaveLength(1);
    });

    test('repeating one decision never bans', () => {
        let record = noStrikes();
        for (let i = 0; i < StrikesUntilBanned + 2; i++)
            record = withStrike(record, strike('p1', 1, 'same'));
        expect(record.count).toBe(1);
        expect(record.banned).toBe(false);
    });

    test('a new decision about the same project counts again', () => {
        // The creator published it again and broke the rules again. Deduping on
        // the project rather than the decision would lose this entirely.
        let record = withStrike(noStrikes(), strike('p1', 1, 'first'));
        record = withStrike(record, strike('p1', 2, 'second'));
        expect(record.count).toBe(2);
        expect(record.strikes.map((s) => s.decision)).toEqual([
            'first',
            'second',
        ]);
    });

    test('three distinct decisions still ban', () => {
        let record = noStrikes();
        for (let i = 0; i < StrikesUntilBanned; i++)
            record = withStrike(record, strike('p1', i + 1, `d${i}`));
        expect(record.banned).toBe(true);
    });

    test('strikes without a decision are still counted', () => {
        // Records written before decisions were identified, and any caller that
        // supplies none: an absent id must not read as "already recorded".
        const anonymous: Strike = {
            project: 'p1',
            flags: ['violence'],
            moderator: 'mod',
            time: 1,
        };
        let record = withStrike(noStrikes(), anonymous);
        record = withStrike(record, anonymous);
        expect(record.count).toBe(2);
    });

    test('an empty decision is not treated as a match', () => {
        const blank = strike('p1', 1, '');
        let record = withStrike(noStrikes(), blank);
        record = withStrike(record, blank);
        expect(record.count).toBe(2);
    });

    test('withStrike does not mutate the record it was given', () => {
        const before = noStrikes();
        withStrike(before, strike('p'));
        expect(before.count).toBe(0);
        expect(before.strikes).toEqual([]);
    });
});
