import { firebaseReachable } from '#db/Database.ts';
import { getFunctionsInstance } from '#db/firebase.ts';
import type {
    RepostHowToInputs,
    RepostHowToOutput,
    RepostHowToRefusal,
    UnrepostHowToInputs,
    UnrepostHowToOutput,
} from 'shared-types';

/**
 * The two callables behind reposting a how-to into another gallery (#1065).
 *
 * Both go through the server because who may read a repost is kept flat on the
 * how-to for the rules to test without looping, and no client may write that.
 * Their own module, imported only by the how-to page, so the Firebase functions
 * SDK stays off every other page's import graph.
 */

/** What came of reposting: done, or why not. */
export type RepostResult =
    'reposted' | Exclude<RepostHowToRefusal, 'unauthenticated'>;

export async function repostHowTo(
    howTo: string,
    gallery: string,
    x: number,
    y: number,
): Promise<RepostResult> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return 'failed';
    const { httpsCallable } = await import('firebase/functions');
    const repost = httpsCallable<RepostHowToInputs, RepostHowToOutput>(
        functions,
        'repostHowTo',
    );
    try {
        const { data } = await repost({ howTo, gallery, x, y });
        firebaseReachable.set(true);
        if (data.reposted === true) return 'reposted';
        // The affordance only renders for a signed-in editor, so being refused
        // as signed out means something else went wrong.
        return data.error === undefined || data.error === 'unauthenticated'
            ? 'failed'
            : data.error;
    } catch (error) {
        console.error(error);
        return 'failed';
    }
}

/** Take a how-to back out of a gallery it was reposted into. */
export async function unrepostHowTo(
    howTo: string,
    gallery: string,
): Promise<boolean> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return false;
    const { httpsCallable } = await import('firebase/functions');
    const unrepost = httpsCallable<UnrepostHowToInputs, UnrepostHowToOutput>(
        functions,
        'unrepostHowTo',
    );
    try {
        const { data } = await unrepost({ howTo, gallery });
        firebaseReachable.set(true);
        return data.unreposted === true;
    } catch (error) {
        console.error(error);
        return false;
    }
}
