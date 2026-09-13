import { firestore } from '@db/firebase';
import {
    collection,
    getDocs,
    limit,
    query,
    where,
    type QueryConstraint,
} from 'firebase/firestore';

/**
 * How much is waiting for this reviewer, up to `CountLimit`.
 *
 * The same queries `/moderate` runs, so the count and the page cannot disagree.
 * Limited rather than aggregated: a bell badge is a nudge, not a report, and
 * `9+` says everything a number past that would. Using `getCountFromServer`
 * would mean a new Firestore import on every page's graph for a number nobody
 * reads precisely.
 *
 * Returns 0 rather than throwing on a backend that can't be reached: an empty
 * bell is the honest answer when we don't know.
 */

/** Past this, the answer is "more than this". */
export const CountLimit = 9;

async function count(
    name: string,
    constraints: QueryConstraint[],
    room: number,
): Promise<number> {
    if (firestore === undefined || room <= 0) return 0;
    try {
        const found = await getDocs(
            query(collection(firestore, name), ...constraints, limit(room)),
        );
        return found.size;
    } catch {
        // A query the indexes don't cover, or no connection. Either way this is
        // a badge, and a thrown error would empty the whole bell.
        return 0;
    }
}

export default async function countPending(
    uid: string,
    moderator: boolean,
): Promise<number> {
    let found = await count(
        'reports',
        [
            // A curator's queue is an array-contains on the report's own
            // `moderators`, never a join against the gallery — the same reason
            // ReportQueue gives.
            moderator
                ? where('platform', '==', true)
                : where('moderators', 'array-contains', uid),
            where('resolved', '==', false),
        ],
        CountLimit,
    );

    // Only a platform moderator can decide a listing, so only they are told one
    // is waiting.
    if (!moderator) return found;

    for (const name of ['galleries', 'kits', 'howtos'])
        found += await count(
            name,
            [where('moderation', '==', 'pending')],
            CountLimit - found,
        );

    return found;
}
