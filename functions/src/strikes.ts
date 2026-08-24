import type { Strike, Strikes } from 'shared-types';

/**
 * How many strikes it takes to lose the ability to make anything public.
 *
 * Three, and the number is deliberately visible to creators: the rights page
 * says so, and each warning says which one this is. A rule people can count is
 * a rule they can follow.
 */
export const StrikesUntilBanned = 3;

/** An empty record, for a creator who has never been found to break a rule. */
export function noStrikes(): Strikes {
    return { v: 1, count: 0, strikes: [], banned: false, bannedAt: null };
}

/**
 * The record after adding one strike.
 *
 * Pure, so both the callable and the client's explanation of "this is their
 * second" agree without either of them owning the rule.
 */
export function withStrike(current: Strikes, strike: Strike): Strikes {
    const count = current.count + 1;
    const banned = count >= StrikesUntilBanned;
    return {
        v: 1,
        count,
        strikes: [...current.strikes, strike],
        banned,
        // Keep the first ban's timestamp: a fourth strike doesn't re-ban
        // someone, and the date is what a reinstatement request is about.
        bannedAt: current.bannedAt ?? (banned ? strike.time : null),
    };
}

/** How many more strikes before public sharing is lost. Zero once it is. */
export function strikesRemaining(strikes: Strikes): number {
    return Math.max(0, StrikesUntilBanned - strikes.count);
}
