import type {
    DocumentReference,
    DocumentSnapshot,
} from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { Change, FirestoreEvent } from 'firebase-functions/v2/firestore';

/** Firestore caps a batched write at 500 operations. Flush below that so a
 *  gallery referenced by many others doesn't overflow a single commit. */
const BATCH_LIMIT = 450;

/** How many words a gallery's search index may hold. It's a prefilter, so a
 *  truncated one costs recall on a huge gallery rather than correctness, and
 *  Firestore caps what a document can hold. */
const MAX_WORDS = 400;

/** How many project names to read when indexing. A gallery far larger than
 *  this is indexed by its earliest projects; see MAX_WORDS. */
const MAX_INDEXED_PROJECTS = 200;

/**
 * Fold text into the word list `Gallery.words` holds. Deliberately simple —
 * lowercase, split on anything that isn't a letter or digit — because the
 * client matches against it through the app's own search engine, which does the
 * fuzzy and substring work. `functions/` compiles with rootDir "src" and so
 * can't import that engine; this only has to agree with it on word boundaries.
 */
function foldWords(texts: string[]): string[] {
    const words = new Set<string>();
    for (const text of texts)
        for (const word of text
            .normalize('NFC')
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u))
            if (word.length > 0) words.add(word);
    return [...words].slice(0, MAX_WORDS);
}

function sameWords(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((word, index) => word === b[index]);
}

/**
 * Whether a curator changed anything a decision was about. Deliberately blind
 * to the fields this function itself writes: its own write comes back through
 * the same trigger, and counting that as a change would re-review forever.
 */
/** Whether the people who may review this gallery's reports have changed. */
export function curatorsChanged(
    before: Record<string, unknown> | undefined,
    after: Record<string, unknown>,
): boolean {
    // A new gallery has no reports to fix up, so only a real change counts.
    if (before === undefined) return false;
    const was = [...((before.curators as string[]) ?? [])].sort();
    const now = [...((after.curators as string[]) ?? [])].sort();
    return JSON.stringify(was) !== JSON.stringify(now);
}

export function galleryContentChanged(
    before: Record<string, unknown> | undefined,
    after: Record<string, unknown>,
): boolean {
    return (
        before === undefined ||
        JSON.stringify(before.name) !== JSON.stringify(after.name) ||
        JSON.stringify(before.description) !==
            JSON.stringify(after.description) ||
        JSON.stringify([...((before.projects as string[]) ?? [])].sort()) !==
            JSON.stringify([...((after.projects as string[]) ?? [])].sort())
    );
}

/**
 * Where a gallery stands with the moderators after this edit (#1311).
 *
 * The transition lives here rather than in a client or a security rule because
 * it is the one thing a curator must not be able to write: `public` is their
 * request, and this is the answer to it. An approval is of what the gallery
 * *was*, so changing its name, description, or contents puts it back in the
 * queue.
 */
export function nextModeration(
    current: string,
    isPublic: boolean,
    contentChanged: boolean,
): string {
    // Not asking to be listed, so there's nothing pending.
    if (!isPublic) return 'unrequested';
    // Asking for the first time, or asking again after a denial.
    if (current === 'unrequested' || current === 'denied') return 'pending';
    // Approval was of what the gallery was, not of whatever it becomes.
    if (current === 'approved' && contentChanged) return 'pending';
    return current;
}

export default async function galleryEdited(
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { id: string }>,
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

    // The expanded how-to viewer lists other galleries derive from this one.
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
        // Neither list changed, so there's nothing to propagate. Falls through
        // to the moderation and index work below rather than returning: this
        // function's own writes land here, and returning early would mean a
        // gallery renamed without a membership change was never re-reviewed.
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

    // Curation of the public listing (#1311) and the search index that goes
    // with it. Both are derived from this document, both are refused to clients
    // by the security rules, and both are written here in one update.
    if (after) {
        const self: Record<string, unknown> = {};

        const contentChanged = galleryContentChanged(before, after);
        const moderation: string = after.moderation ?? 'unrequested';
        const next = nextModeration(
            moderation,
            after.public === true,
            contentChanged,
        );

        if (next !== moderation) {
            self.moderation = next;
            self.moderatedAt = Date.now();
        }

        // A project renamed inside the gallery doesn't touch the gallery
        // document, so its words stay as they were until the next gallery
        // write. Accepted: this is a search prefilter, not an authority.
        if (contentChanged) {
            const projectIDs: string[] = (after.projects ?? []).slice(
                0,
                MAX_INDEXED_PROJECTS,
            );
            const projectNames =
                projectIDs.length === 0
                    ? []
                    : (
                          await db.getAll(
                              ...projectIDs.map((id) =>
                                  db.collection('projects').doc(id),
                              ),
                          )
                      )
                          .map((doc) => doc.get('name'))
                          .filter(
                              (name): name is string =>
                                  typeof name === 'string',
                          );
            const words = foldWords([
                ...Object.values<string>(after.name ?? {}),
                ...Object.values<string>(after.description ?? {}),
                ...projectNames,
            ]);
            if (!sameWords(words, after.words ?? [])) self.words = words;
        }

        if (Object.keys(self).length > 0)
            updates.push({ ref: galleryStore.doc(after.id), data: self });
    }

    // Who may review this gallery's open reports (#938). `moderators` is
    // denormalized onto each report so the curator queue's read rule is an
    // array-contains rather than a get() of this document — see
    // SerializedReport.moderators — which means a change of curators has to be
    // pushed out to the reports rather than joined at read time. Only reports
    // still awaiting review: a resolved one is a record of who decided, and
    // rewriting it would rewrite history. This is a promptness fix, not a
    // security one — the `moderate` callable re-derives responsibility from
    // current visibility before allowing any decision, so a stale list can only
    // fail to show someone a report, never let the wrong person act on one.
    if (after && curatorsChanged(before, after)) {
        const curators: string[] = after.curators ?? [];
        const open = await db
            .collection('reports')
            .where('gallery', '==', after.id)
            .where('resolved', '==', false)
            .get();
        for (const report of open.docs)
            updates.push({ ref: report.ref, data: { moderators: curators } });
    }

    return flush();
}
