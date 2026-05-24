import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type {
    Change,
    FirestoreEvent,
} from 'firebase-functions/v2/firestore';

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
    const batch = db.batch();

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

            batch.update(galleryStore.doc(expandedGallery.id), {
                howToExpandedGalleries: howToExpandedGalleries,
                howToViewers: howToViewers,
                howToViewersFlat: howToViewersFlat,
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

            batch.update(galleryStore.doc(expandedGallery.id), {
                howToViewers: howToViewers,
                howToViewersFlat: howToViewersFlat,
            });
        });
    }

    return batch.commit();
}
