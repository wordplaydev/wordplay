import { foldWords, sameWords } from './searchWords.js';
import { nextModeration } from './moderationRequest.js';
import type {
    DocumentReference,
    DocumentSnapshot,
} from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { Change, FirestoreEvent } from 'firebase-functions/v2/firestore';

/** Firestore caps a batched write at 500 operations. Flush below that so a
 *  gallery referenced by many others doesn't overflow a single commit. */
const BATCH_LIMIT = 450;

/** How many project names to read when indexing. A gallery far larger than
 *  this is indexed by its earliest projects; see `MAX_WORDS` in `searchWords`. */
const MAX_INDEXED_PROJECTS = 200;

/** The same cap for the characters shared in a gallery (#822). Separate from
 *  the project cap so a gallery full of drawings still indexes its projects. */
const MAX_INDEXED_CHARACTERS = 200;

/** The membership of a gallery a viewer list can be drawn from. */
export type HowToSource = { curators: string[]; creators: string[] };

/** The pair a gallery stores: who may view its how-tos, and by way of what. */
export type HowToViewers = {
    howToViewers: Record<string, string[]>;
    howToViewersFlat: string[];
};

/**
 * Expanded how-to access reaches "a gallery by the same curator", and this is
 * what makes that true rather than merely documented. Without it a curator
 * could list any gallery id at all and the trigger would copy that gallery's
 * member ids into a field readable by everyone who can read theirs — which,
 * for a public gallery, discloses a private one's membership (#1352).
 *
 * Sharing one curator is the strongest test available here: a trigger has no
 * actor, so "the person who added it curates both" is not a question it can ask.
 */
export function sharesCurator(a: string[], b: string[]): boolean {
    return a.some((uid) => b.includes(uid));
}

/**
 * The flat list the security rules and the client's `array-contains` query
 * match on. Deduplicated because one person can reach a gallery through two
 * others, and **sorted** because this value is diffed against what is stored to
 * decide whether to write — and an unstable order there is a trigger that
 * rewrites its own document forever.
 */
export function flattenHowToViewers(
    viewers: Record<string, string[]>,
): string[] {
    return [...new Set(Object.values(viewers).flat())].sort();
}

/**
 * Who may view a gallery's how-tos, derived from the galleries it draws on.
 * A source contributes nothing if it has gone, or if it shares no curator with
 * the gallery drawing on it. Total and deterministic: the same inputs give a
 * byte-identical answer, which is what lets the caller diff before writing.
 */
export function deriveHowToViewers(
    expandedGalleryIds: string[],
    sources: Map<string, HowToSource>,
    targetCurators: string[],
): HowToViewers {
    const howToViewers: Record<string, string[]> = {};
    for (const id of [...expandedGalleryIds].sort()) {
        const source = sources.get(id);
        if (source === undefined) continue;
        if (!sharesCurator(source.curators, targetCurators)) continue;
        howToViewers[id] = [
            ...new Set([...source.curators, ...source.creators]),
        ].sort();
    }
    return {
        howToViewers,
        howToViewersFlat: flattenHowToViewers(howToViewers),
    };
}

/** Whether a derived pair differs from what the gallery already stores. */
export function howToViewersChanged(
    stored: Record<string, unknown>,
    derived: HowToViewers,
): boolean {
    const canonical = (viewers: Record<string, string[]>) =>
        JSON.stringify(
            Object.keys(viewers)
                .sort()
                .map((key) => [key, viewers[key]]),
        );
    return (
        canonical((stored.howToViewers as Record<string, string[]>) ?? {}) !==
            canonical(derived.howToViewers) ||
        !sameWords(
            (stored.howToViewersFlat as string[]) ?? [],
            derived.howToViewersFlat,
        )
    );
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
            JSON.stringify([...((after.projects as string[]) ?? [])].sort()) ||
        // Characters are gallery content too (#822), so adding one to an
        // approved public gallery puts it back in the queue — approval was of
        // what the gallery was.
        JSON.stringify([...((before.characters as string[]) ?? [])].sort()) !==
            JSON.stringify([...((after.characters as string[]) ?? [])].sort())
    );
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
            const howToViewers: Record<string, string[]> = {
                ...otherGallery.howToViewers,
            };
            delete howToViewers[before.id];

            updates.push({
                ref: galleryStore.doc(expandedGallery.id),
                data: {
                    howToExpandedGalleries: howToExpandedGalleries,
                    howToViewers: howToViewers,
                    howToViewersFlat: flattenHowToViewers(howToViewers),
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
            // Patching one entry rather than re-deriving the whole map, which
            // would mean reading every gallery this one draws on. The full
            // recompute happens on that gallery's own next write; this is here
            // so revoking access is prompt rather than eventual.
            //
            // The same-curator check has to be made here too: without it this
            // is a back door into exactly what deriveHowToViewers refuses.
            const howToViewers: Record<string, string[]> = {
                ...otherGallery.howToViewers,
            };
            if (
                sharesCurator(after.curators ?? [], otherGallery.curators ?? [])
            )
                howToViewers[after.id] = [
                    ...new Set([...after.curators, ...after.creators]),
                ].sort();
            else delete howToViewers[after.id];

            updates.push({
                ref: galleryStore.doc(expandedGallery.id),
                data: {
                    howToViewers: howToViewers,
                    howToViewersFlat: flattenHowToViewers(howToViewers),
                },
            });
        });
    }

    // Curation of the public listing (#1311) and the search index that goes
    // with it. Both are derived from this document, both are refused to clients
    // by the security rules, and both are written here in one update.
    if (after) {
        const self: Record<string, unknown> = {};

        // Who may view this gallery's how-tos, derived from the galleries it
        // draws on. The client used to compute this and write it itself, which
        // meant anyone who could edit a gallery could grant its how-tos to
        // anyone they named (#1352) — so it is derived here and refused there.
        //
        // Recomputed on every write rather than only when the list changes: it
        // costs nothing for the galleries that draw on none, and it means one
        // still carrying a value a client wrote heals on its next write instead
        // of needing a migration. Merged into `self` rather than pushed as its
        // own update, and written only when it differs from what is stored —
        // this document's write comes back through this same trigger, and an
        // unconditional write here would never stop.
        const expandedGalleryIds: string[] = after.howToExpandedGalleries ?? [];
        if (expandedGalleryIds.length > 0) {
            const sourceDocs = await db.getAll(
                ...expandedGalleryIds.map((id) => galleryStore.doc(id)),
            );
            const sources = new Map<string, HowToSource>();
            for (const source of sourceDocs) {
                const data = source.data();
                if (data === undefined) continue;
                sources.set(source.id, {
                    curators: data.curators ?? [],
                    creators: data.creators ?? [],
                });
            }
            const derived = deriveHowToViewers(
                expandedGalleryIds,
                sources,
                after.curators ?? [],
            );
            if (howToViewersChanged(after, derived)) {
                self.howToViewers = derived.howToViewers;
                self.howToViewersFlat = derived.howToViewersFlat;
            }
        } else if (
            howToViewersChanged(after, {
                howToViewers: {},
                howToViewersFlat: [],
            })
        ) {
            // Drawing on nothing means granting nothing — including to a
            // gallery whose list was emptied, or one whose values a client wrote
            // before this was the server's to decide.
            self.howToViewers = {};
            self.howToViewersFlat = [];
        }

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
            // A character's stored name is `username/Name`; foldWords splits
            // on the slash, so both halves are searchable — which is what
            // someone looking for a classmate's drawing would type.
            const characterIDs: string[] = (after.characters ?? []).slice(
                0,
                MAX_INDEXED_CHARACTERS,
            );
            const characterNames =
                characterIDs.length === 0
                    ? []
                    : (
                          await db.getAll(
                              ...characterIDs.map((id) =>
                                  db.collection('characters').doc(id),
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
                ...characterNames,
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
