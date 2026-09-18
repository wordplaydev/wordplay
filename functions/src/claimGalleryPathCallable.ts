import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    ClaimGalleryPathInputs,
    ClaimGalleryPathOutput,
} from 'shared-types';
import { galleryCurators, setGalleryPath } from './galleryPaths.js';

/**
 * Give a gallery a vanity path or change it (#180). Giving one up is
 * releaseGalleryPath.
 *
 * A callable rather than a client write because uniqueness cannot be expressed
 * as a security rule: the reservation in `gallerypaths/{folded}` has to be taken
 * in the same transaction that writes the gallery's own `path`, and only the
 * Admin SDK can touch it.
 *
 * Never takes a uid — the caller is `request.auth.uid` — and refuses anyone who
 * is not a curator of this gallery. Creators may add work to a gallery; naming
 * it is a curator's decision, the same split `public` already has.
 */
export default async function claimGalleryPath(
    request: CallableRequest<ClaimGalleryPathInputs>,
): Promise<ClaimGalleryPathOutput> {
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

        const result = await setGalleryPath(gallery, path);
        return result === 'claimed' ? { claimed: true } : { error: result };
    } catch (error) {
        console.error('Could not set a gallery path', error);
        return { error: 'failed' };
    }
}
