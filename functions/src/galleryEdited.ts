import type {
    DocumentReference,
    DocumentSnapshot,
} from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type {
    Change,
    FirestoreEvent,
} from 'firebase-functions/v2/firestore';

/** Firestore caps a batched write at 500 operations. Flush below that so a
 *  gallery referenced by many others doesn't overflow a single commit. */
const BATCH_LIMIT = 450;

export default async function galleryEdited(
    event: FirestoreEvent<
        Change<DocumentSnapshot> | undefined,
        { id: string }
    >,
): Promise<unknown> {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const db = getFirestore();
    const galleryStore = db.collection('galleries');

    // Accumulate updates and flush in ≤BATCH_LIMIT-op batches, since the
    // referencing-gallery query below is unbounded.
    const updates: { ref: DocumentReference; data: Record<string, unknown> }[] =
        [];
    const flush = async () => {
        const promises: Promise<unknown>[] = [];
        for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
            const batch = db.batch();
            for (const { ref, data } of updates.slice(i, i + BATCH_LIMIT))
                batch.update(ref, data);
            promises.push(batch.commit());
        }
        return Promise.all(promises);
    };

    const listEq = (a: string[], b: string[]): boolean => {
        if (a.length !== b.length) return false;
        const aSorted = [...a].sort();
        const bSorted = [...b].sort();

        for (let i = 0; i < aSorted.length; i++) {
            if (aSorted[i] !== bSorted[i]) return false;
        }
        return true;
    };

    // if the list of creators or curators for the gallery has changed,
    // then we need to look at all other galleries to see if they have this changed gallery
    // in its list of expanded galleries
    // if so, then we need to update the list of viewers for that expanded gallery

    if (before && !after) {
        // if deletion, then remove this gallery from all other galleries' lists of expanded galleries and viewers

        const galleriesToUpdate = await galleryStore
            .where('howToExpandedGalleries', 'array-contains', before.id)
            .get();
        galleriesToUpdate.forEach((expandedGallery) => {
            const otherGallery = expandedGallery.data();
            const howToExpandedGalleries: string[] =
                otherGallery.howToExpandedGalleries.filter(
                    (id: string) => id !== before.id,
                );
            const howToViewers: Record<string, string[]> =
                otherGallery.howToViewers;
            delete howToViewers[before.id];
            const howToViewersFlat: string[] =
                Object.values(howToViewers).flat();

            updates.push({
                ref: galleryStore.doc(expandedGallery.id),
                data: {
                    howToExpandedGalleries: howToExpandedGalleries,
                    howToViewers: howToViewers,
                    howToViewersFlat: howToViewersFlat,
                },
            });
        });
    } else if (
        after &&
        before &&
        listEq(before.curators, after.curators) &&
        listEq(before.creators, after.creators)
    ) {
        // if none of the relevant fields changed, then return to prevent infinite loops
        return;
    } else if (after) {
        // otherwise, update the howToViewers and howToViewersFlat fields of all galleries

        const galleriesToUpdate = await galleryStore
            .where('howToExpandedGalleries', 'array-contains', after.id)
            .get();

        galleriesToUpdate.forEach((expandedGallery) => {
            const otherGallery = expandedGallery.data();
            const howToViewers: Record<string, string[]> = {
                ...otherGallery.howToViewers,
                [after.id]: [...after.curators, ...after.creators],
            };
            const howToViewersFlat: string[] =
                Object.values(howToViewers).flat();

            updates.push({
                ref: galleryStore.doc(expandedGallery.id),
                data: {
                    howToViewers: howToViewers,
                    howToViewersFlat: howToViewersFlat,
                },
            });
        });
    }

    return flush();
}
