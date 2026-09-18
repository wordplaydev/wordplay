import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    GalleryPathAvailableInputs,
    GalleryPathAvailableOutput,
} from 'shared-types';
import { galleryPathsAvailable } from './galleryPaths.js';

/**
 * Whether each vanity path could be claimed (#180).
 *
 * Advisory: the transaction inside claimGalleryPath is what actually decides,
 * and two curators can still submit the same path in the same second. This is
 * what the gallery's path field shows while someone types.
 *
 * Signed in and App Check enforced, unlike usernameAvailable — you cannot be
 * naming a gallery without an account — and capped per call, because it is a
 * way to ask about the reservation index, which is otherwise unreadable. It
 * answers only about the paths asked, never enumerating.
 */

/** Enough for a field's worth of retries, and no more: this is one person
 *  typing one name, not a roster. */
const MaxPaths = 10;

export default async function galleryPathAvailable(
    request: CallableRequest<GalleryPathAvailableInputs>,
): Promise<GalleryPathAvailableOutput> {
    if (request.auth?.uid === undefined) return {};
    const gallery = request.data?.gallery;
    const paths = request.data?.paths;
    if (typeof gallery !== 'string' || !Array.isArray(paths)) return {};
    const asked = paths
        .filter((path) => typeof path === 'string')
        .slice(0, MaxPaths);
    if (asked.length === 0) return {};

    return galleryPathsAvailable(asked, gallery);
}
