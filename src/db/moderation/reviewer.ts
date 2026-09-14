import { Galleries } from '@db/Database';

/**
 * Whether this creator curates any gallery, and so answers for what is in it.
 *
 * Distinct from the `mod` claim: a curator reviews their own gallery and
 * nothing else, which is why they see one queue and a moderator sees several.
 */
export function curatesAnyGallery(uid: string | undefined): boolean {
    if (uid === undefined) return false;
    return [...Galleries.accessibleGalleries.values()].some((gallery) =>
        gallery.hasCurator(uid),
    );
}

/**
 * Whether this creator is in a position to review anything at all.
 *
 * Not "is something waiting" — a curator should be able to look at an empty
 * queue rather than only find it when something lands in it.
 *
 * Three surfaces ask, which is why it is here rather than in any of them: the
 * notification bell's way in, the home page's link, and /moderate's own gate.
 * The moderator half is passed in because it is a promise the caller has
 * already resolved, and the gallery half is synchronous — putting the await
 * here would make every caller's `$derived` asynchronous for no gain.
 */
export function isReviewer(
    moderator: boolean,
    uid: string | undefined,
): boolean {
    return moderator || curatesAnyGallery(uid);
}
