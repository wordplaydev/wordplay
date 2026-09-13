/**
 * Whether a listing decision may be applied, given who is deciding (#906).
 *
 * Listing is the platform's, for the reason a warning is: a curator who could
 * approve their own is what curation prevents. `moderate` admits two kinds of
 * decider — a platform moderator, and a curator of the gallery the thing is in —
 * and a curator is genuinely responsible for what their gallery holds. But that
 * responsibility is a takedown, never a listing.
 *
 * Galleries and kits escaped this only by accident. A kit has no gallery, so
 * `getResponsibility` can never answer `curators` for one and the curator branch
 * is unreachable. A gallery's own visibility names itself, so a curator of a
 * private gallery with other members in it *is* `{kind:'curators'}` — and could
 * approve their own listing, then make it public, which `nextModeration` leaves
 * approved because nothing about it changed. A how-to is the first listable
 * subject that sits in someone else's gallery, so it would have inherited that
 * directly.
 *
 * A leaf module rather than a function inside `moderate.ts`, because the root
 * vitest project runs `functions/src/**` too and CI's `npm ci` installs only the
 * root's dependencies — so a test that reaches a callable cannot resolve
 * `firebase-functions` there, while the same test passes locally against a
 * `functions/node_modules` left over from a previous build. Every other
 * functions test visible to that project imports a leaf for the same reason.
 */
export function decidedListing(
    listing: 'approved' | 'denied' | undefined,
    asPlatform: boolean,
): 'approved' | 'denied' | undefined {
    return asPlatform ? listing : undefined;
}
