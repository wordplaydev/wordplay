import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type {
    ModerateGalleryInputs,
    ModerateGalleryOutput,
} from 'shared-types';

const GalleriesCollection = 'galleries';

/**
 * Record a moderator's decision about whether a gallery may be listed publicly
 * (#1311).
 *
 * Public galleries are curated rather than self-published, so `public` on the
 * gallery is only the curator's request; this is what decides whether anyone
 * finds it. Server-side for the same reason `moderateProject` is: the state a
 * curator is shown, and the state the listing query filters on, both have to be
 * something a client can't write.
 */
export default async function moderateGallery(
    request: CallableRequest<ModerateGalleryInputs>,
): Promise<ModerateGalleryOutput> {
    // Only moderators, and the token is the authority — not the client's word.
    if (request.auth?.token.mod !== true)
        throw new HttpsError(
            'permission-denied',
            'Only moderators can moderate galleries.',
        );

    const { gallery: galleryID, decision, flags } = request.data;
    if (typeof galleryID !== 'string' || galleryID.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a gallery id.');
    if (decision !== 'approved' && decision !== 'denied')
        throw new HttpsError(
            'invalid-argument',
            'Expected a decision of approved or denied.',
        );
    if (typeof flags !== 'object' || flags === null)
        throw new HttpsError('invalid-argument', 'Expected flags.');

    const db = getFirestore();
    const galleryRef = db.collection(GalleriesCollection).doc(galleryID);
    const galleryDoc = await galleryRef.get();
    if (!galleryDoc.exists)
        throw new HttpsError('not-found', 'No such gallery.');

    // A gallery that breaks a rule loses its public sharing outright, the same
    // way a flagged project does — leaving it reachable by link while telling
    // its curator it was denied would be a decision with nothing behind it. A
    // denial with no flag is a quality decision: the gallery stays shareable,
    // it just isn't listed.
    const violation = Object.values(flags).some((state) => state === true);
    const unpublished = violation;

    await galleryRef.update({
        moderation: decision,
        moderatedAt: Date.now(),
        flags,
        ...(unpublished ? { public: false } : {}),
    });

    return { moderation: decision, unpublished };
}
