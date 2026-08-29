import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type {
    ModerateGalleryInputs,
    ModerateGalleryOutput,
} from 'shared-types';
import moderate from './moderate.js';

/**
 * Superseded by the `moderate` callable (#938), and kept for exactly one
 * release, for the reason given in moderateProject.ts: a long-open tab holds a
 * stale bundle and would call this name.
 */
export default async function moderateGallery(
    request: CallableRequest<ModerateGalleryInputs>,
): Promise<ModerateGalleryOutput> {
    const { gallery, decision, flags } = request.data;
    if (decision !== 'approved' && decision !== 'denied')
        throw new HttpsError(
            'invalid-argument',
            'Expected a decision of approved or denied.',
        );
    await moderate({
        ...request,
        data: {
            kind: 'gallery',
            subject: gallery,
            flags,
            listing: decision,
            // A gallery has no author, so a warning has nobody to warn.
            strike: false,
            decision: `gallery-${gallery}-${decision}`,
        },
    });
    // A gallery that broke a rule loses its public sharing outright; a denial
    // with no flag is a quality decision, which leaves it shareable by link.
    const unpublished = Object.values(flags).some((state) => state === true);
    return { moderation: decision, unpublished };
}
