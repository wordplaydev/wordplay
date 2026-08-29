import type { Finding, Strike, Strikes } from 'shared-types';

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
 *
 * Idempotent on `decision`: a decision already recorded leaves the record
 * exactly as it was. The moderator's page keeps a project's decision id across
 * a retry, so re-submitting after a failure whose response was lost cannot warn
 * a creator twice — and at three warnings a spurious one is a ban. Deduping by
 * project instead would be wrong: a creator can publish the same project again
 * and break the same rule again, and that is a second warning.
 */
export function withStrike(current: Strikes, strike: Strike): Strikes {
    // Only a decision that says which one it is can be recognised again. An
    // absent or empty id is not a match for anything, or every strike recorded
    // before decisions were identified would match every other.
    if (
        strike.decision !== undefined &&
        strike.decision !== '' &&
        current.strikes.some((past) => past.decision === strike.decision)
    )
        return current;

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

/**
 * The record after noting a curator's decision.
 *
 * Deliberately not a strike: `count` doesn't move, so this can never lead to a
 * ban. A gallery's curator moderates their own gallery; letting them cost
 * someone their platform-wide publishing would hand a classroom decision a
 * reach it was never meant to have. What this is for is the pattern — a
 * platform moderator looking at a creator can see that other galleries have
 * decided about them too.
 *
 * Idempotent on `decision` for the same reason `withStrike` is: a retry whose
 * response was lost must not record the same finding twice.
 */
export function withFinding(current: Strikes, finding: Finding): Strikes {
    if (
        finding.decision !== '' &&
        (current.findings ?? []).some(
            (past) => past.decision === finding.decision,
        )
    )
        return current;
    return { ...current, findings: [...(current.findings ?? []), finding] };
}

/** How many more strikes before public sharing is lost. Zero once it is. */
export function strikesRemaining(strikes: Strikes): number {
    return Math.max(0, StrikesUntilBanned - strikes.count);
}
