import type { ClaimName, ClaimSet } from 'shared-types';

/**
 * What changing somebody's privileges does, with nothing around it.
 *
 * Split out of `setClaims.ts` because the root `tsconfig.json` covers `src/`
 * and `tests/` but installs no `functions/node_modules` — so a test on this
 * side that imports a functions module importing `firebase-functions` fails
 * `svelte-check` in CI while passing locally, where those modules exist. The
 * same reason `origin.ts` has no imports at all. `functionsLeafImports.test.ts`
 * holds the boundary.
 *
 * It is also the right shape on its own: these are the rules, and they are
 * worth testing without an emulator or a callable around them.
 */
/** The only names that may be written. An unbounded claim map would be a way to
 *  put arbitrary keys into somebody's token. Kept in step with the flag list in
 *  scripts/claims.js by claimFlagsSync.test.ts. */
/** Whether a string names a claim this callable may write. */
export function isWritableClaim(name: string): name is ClaimName {
    return WritableClaims.some((claim) => claim === name);
}

export const WritableClaims: ClaimName[] = [
    'admin',
    'mod',
    'teacher',
    'banned',
];

/** Why a change was refused, or undefined if it may go ahead. */
export type Refusal =
    /** Losing your own superuser claim takes the page away mid-press. */
    | 'self-demotion'
    /** Banning also un-publishes and warns, and none of that happens here. */
    | 'ban'
    | 'unknown-claim';

/**
 * Whether an administrator may make this change, and what the claims become.
 *
 * Pure, and separate from the callable, so the rules it enforces can be tested
 * without an emulator — the same split `strikes.ts` uses for `withStrike`.
 */
export function nextClaims(
    current: { [key: string]: unknown } | undefined | null,
    changes: Partial<ClaimSet>,
    who: { caller: string; subject: string },
): { claims: Record<string, unknown>; refusal?: Refusal } {
    const names = Object.keys(changes);
    if (!names.every(isWritableClaim))
        return { claims: {}, refusal: 'unknown-claim' };

    // Refused rather than confirmed: a confirmation is a thing to click
    // through, and the remedy for an administrator who should not be one is
    // another administrator, or scripts/claims.js with a service key.
    // Deliberately not "the last administrator" — counting them needs a second
    // sweep and races a concurrent demotion, and this already makes a
    // platform with no administrator unreachable one press at a time.
    if (who.subject === who.caller && changes.admin === false)
        return { claims: {}, refusal: 'self-demotion' };

    // One path to a ban, and it is the moderation queue: a ban also takes down
    // what is already public and warns the creator, and neither happens here.
    if (changes.banned === true) return { claims: {}, refusal: 'ban' };

    // Spread what is already there: setCustomUserClaims replaces the whole
    // object, so writing one claim alone strips the rest — the same rule ban()
    // in moderate.ts follows. A claim being taken away is deleted rather than
    // written `false`, so a token carries only what someone actually holds.
    const claims: Record<string, unknown> = { ...(current ?? {}) };
    for (const name of names) {
        if (changes[name] === true) claims[name] = true;
        else delete claims[name];
    }
    return { claims };
}

/** What a claims object holds, as stored. */
export function storedClaims(
    claims: { [key: string]: unknown } | undefined | null,
): ClaimSet {
    return {
        admin: claims?.admin === true,
        mod: claims?.mod === true,
        teacher: claims?.teacher === true,
        banned: claims?.banned === true,
    };
}
