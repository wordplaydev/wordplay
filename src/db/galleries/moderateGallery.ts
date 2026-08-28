import { getFunctionsInstance } from '@db/firebase';
import type {
    ModerateGalleryInputs,
    ModerateGalleryOutput,
} from 'shared-types';

/**
 * Record a moderator's decision about whether a gallery may be listed (#1311).
 *
 * A callable rather than a direct write, because the decision is exactly what a
 * client must not be able to make: the security rules refuse `moderation` from
 * everyone, so a curator can request public listing but never grant it. See
 * functions/src/moderateGallery.ts.
 */
export default async function moderateGallery(
    inputs: ModerateGalleryInputs,
): Promise<ModerateGalleryOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined)
        throw new Error('Cloud functions are unavailable.');
    const { httpsCallable } = await import('firebase/functions');
    const call = httpsCallable<ModerateGalleryInputs, ModerateGalleryOutput>(
        functions,
        'moderateGallery',
    );
    return (await call(inputs)).data;
}
