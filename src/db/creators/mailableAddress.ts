/**
 * Whether an address is one we could actually write to. Mirrors
 * functions/src/username.ts, which is the authority; usernameSync.test.ts
 * compares the two.
 *
 * A module of its own, importing nothing, because the alternative is worse in
 * both directions. Putting it in `username.ts` would drag that file and
 * `isValidEmail` onto all five audited page graphs through `CreatorDatabase`,
 * and every one of them is at its ceiling (see src/util/importGraph.test.ts).
 *
 * Deliberately not `isValidEmail`, which is the older rule used for signing in:
 * despite looking looser it refuses a `+` in the local part and every TLD
 * longer than four characters, so a school on a `.education` domain would have
 * its roster of addresses read as ordinary metadata and those students silently
 * given passwords instead.
 */

/** The domain appended to a username to make an address Firebase Auth accepts,
 *  since it has no username primitive. Also spelled on `Creator` and in the
 *  server's copy; usernameSync.test.ts holds all three together. */
export const UsernameEmailDomain = '@u.wordplay.dev';

export function isMailableAddress(text: string): boolean {
    return (
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text) &&
        !text.endsWith(UsernameEmailDomain)
    );
}
