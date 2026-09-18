import { firebaseReachable } from '@db/Database';
import { getFunctionsInstance } from '@db/firebase';
import type {
    ClaimGalleryPathInputs,
    ClaimGalleryPathOutput,
    GalleryPathAvailableInputs,
    GalleryPathAvailableOutput,
    ReleaseGalleryPathInputs,
    ReleaseGalleryPathOutput,
} from 'shared-types';

/**
 * The three callables behind a gallery's vanity path (#180).
 *
 * All go through the server because uniqueness cannot be expressed as a
 * security rule: the reservation in `gallerypaths/{folded}` is unreadable and
 * unwritable by every client, and only the Admin SDK may take or delete it.
 */

/**
 * Whether these paths could be claimed by this gallery.
 *
 * Advisory: the transaction inside `claimGalleryPath` is what actually decides,
 * so two curators can still submit the same path in the same second.
 */
export async function galleryPathsAvailable(
    gallery: string,
    paths: string[],
): Promise<Record<string, boolean> | undefined> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return undefined;
    const { httpsCallable } = await import('firebase/functions');
    const available = httpsCallable<
        GalleryPathAvailableInputs,
        GalleryPathAvailableOutput
    >(functions, 'galleryPathAvailable');
    try {
        const { data } = await available({ gallery, paths });
        firebaseReachable.set(true);
        return data;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

/** Whether one path could be claimed. Undefined when we couldn't ask, which the
 *  field treats as "don't say anything yet" rather than as unavailable —
 *  telling a curator their own free name is taken is the worse failure. */
export async function galleryPathAvailable(
    gallery: string,
    path: string,
): Promise<boolean | undefined> {
    return (await galleryPathsAvailable(gallery, [path]))?.[path];
}

/** What came of asking for a path. Every arm is something to tell a curator
 *  except 'failed', which is the one that means "try again". */
export type ClaimGalleryPathResult =
    | 'claimed'
    | 'cleared'
    | 'taken'
    | 'invalid'
    | 'missing'
    | 'not-listed'
    | 'not-curator'
    | 'failed';

/** Give this gallery a vanity path, change it, or clear it with a null path. */
export async function claimGalleryPath(
    gallery: string,
    path: string | null,
): Promise<ClaimGalleryPathResult> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return 'failed';
    const { httpsCallable } = await import('firebase/functions');
    const claim = httpsCallable<ClaimGalleryPathInputs, ClaimGalleryPathOutput>(
        functions,
        'claimGalleryPath',
    );
    try {
        const { data } = await claim({ gallery, path });
        firebaseReachable.set(true);
        if (data.claimed === true) return 'claimed';
        if (data.cleared === true) return 'cleared';
        // 'unauthenticated' is not worth its own message: the affordance only
        // renders for a signed-in curator, so seeing it means something else
        // went wrong.
        return data.error === undefined || data.error === 'unauthenticated'
            ? 'failed'
            : data.error;
    } catch (error) {
        console.error(error);
        return 'failed';
    }
}

/** What came of giving a name up. 'taken' means it was not this gallery's to
 *  give — gone already, someone else's, or a deleted gallery's tombstone. */
export type ReleaseGalleryPathResult =
    'released' | 'taken' | 'invalid' | 'missing' | 'not-curator' | 'failed';

/** Give up one of this gallery's names for good, so anyone may claim it. */
export async function releaseGalleryPath(
    gallery: string,
    path: string,
): Promise<ReleaseGalleryPathResult> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return 'failed';
    const { httpsCallable } = await import('firebase/functions');
    const release = httpsCallable<
        ReleaseGalleryPathInputs,
        ReleaseGalleryPathOutput
    >(functions, 'releaseGalleryPath');
    try {
        const { data } = await release({ gallery, path });
        firebaseReachable.set(true);
        if (data.released === true) return 'released';
        // As in claimGalleryPath: the affordance only renders for a signed-in
        // curator, so 'unauthenticated' means something else went wrong.
        return data.error === undefined || data.error === 'unauthenticated'
            ? 'failed'
            : data.error;
    } catch (error) {
        console.error(error);
        return 'failed';
    }
}
