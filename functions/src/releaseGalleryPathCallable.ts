import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    ReleaseGalleryPathInputs,
    ReleaseGalleryPathOutput,
} from 'shared-types';
import { galleryCurators, releaseGalleryPath } from './galleryPaths.js';

/**
 * Give up one of a gallery's names for good (#180).
 *
 * A callable for the same reason claimGalleryPath is: the reservation in
 * `gallerypaths/{folded}` is unreadable and unwritable by every client, so only
 * the Admin SDK can delete it, and it has to go in the same transaction that
 * takes the name off the gallery.
 *
 * Its own verb rather than a mode of claimGalleryPath, whose `path: null`
 * already means something different — stop answering to this name, but keep
 * holding it.
 */
export default async function releaseGalleryPathCallable(
    request: CallableRequest<ReleaseGalleryPathInputs>,
): Promise<ReleaseGalleryPathOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined) return { error: 'unauthenticated' };

    const gallery = request.data?.gallery;
    const path = request.data?.path;
    if (typeof gallery !== 'string' || gallery.length === 0)
        return { error: 'missing' };
    if (typeof path !== 'string' || path.length === 0)
        return { error: 'invalid' };

    try {
        const curators = await galleryCurators(gallery);
        if (curators.length === 0) return { error: 'missing' };
        if (!curators.includes(uid)) return { error: 'not-curator' };

        const result = await releaseGalleryPath(gallery, path);
        return result === 'released' ? { released: true } : { error: result };
    } catch (error) {
        console.error('Could not release a gallery path', error);
        return { error: 'failed' };
    }
}
