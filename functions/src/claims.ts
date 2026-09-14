/**
 * Which privileges a set of custom claims carries.
 *
 * `admin` is the superuser: it implies `mod` and `teacher`, so one claim is
 * enough to run the place and nobody has to hold three. `banned` is the one
 * thing it does not imply — that is the loss of public sharing (#193), not a
 * privilege, and authority over other people is not immunity from a decision
 * about your own content. A banned administrator can still lift their own ban
 * from /admin, so nothing is unrecoverable.
 *
 * Duplicated from src/db/creators/claims.ts rather than shared, for the reason
 * responsibility.ts is duplicated: `shared-types` carries types only, so a
 * value imported by that name compiles and then throws at runtime, taking every
 * callable in index.ts with it. claimsSync.test.ts holds both copies — and
 * firestore.rules' isMod/isTeacher — to one table.
 */
export function hasClaim(
    claims: { [key: string]: unknown } | undefined | null,
    claim: 'admin' | 'mod' | 'teacher' | 'banned',
): boolean {
    if (claims === undefined || claims === null) return false;
    if (claim !== 'banned' && claims.admin === true) return true;
    return claims[claim] === true;
}
