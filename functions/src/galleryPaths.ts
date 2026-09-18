import { getFirestore } from 'firebase-admin/firestore';
import {
    foldGalleryPath,
    GalleryPathCollection,
    isValidGalleryPath,
    MaxGalleryPathAliases,
} from './galleryPath.js';
import { isRecord, isStringArray, must } from './shared/guards.js';

/**
 * A gallery's vanity path, and the index that makes it unique (#180).
 *
 * Two places, for the reason handles.ts gives about usernames:
 *
 * - `galleries/{id}.path` answers "what is this gallery called?" It is the
 *   record, readable by anyone who may read the gallery, and what a visitor
 *   following a vanity link is matched against.
 * - `gallerypaths/{folded}` answers "is this name taken?" It is the index, and
 *   it exists because Firestore has no unique-column constraint: the only way
 *   to make "check, then claim" atomic is a document *named after the thing
 *   being claimed*, so a transaction's create either wins or fails. Readable by
 *   nobody, since a readable name-keyed index enumerates every gallery.
 *
 * Both are server-written; firestore.rules forbids every client write.
 *
 * Unlike usernames there is deliberately **no sweep** (sweepReservations.ts).
 * That one exists because joinAccount holds a name across `createUser`, a step
 * no Firestore transaction can cover, so a hold can be abandoned. A gallery
 * already exists when its path is claimed, so the whole claim is one
 * transaction and there is no pending state to collect.
 */

const GalleriesCollection = 'galleries';

export type GalleryPathReservation = {
    v: 1;
    /** The gallery holding it, or null once the gallery has been deleted. */
    gallery: string | null;
    /** The folded path; the reservation's own document id. */
    path: string;
    claimed: number;
    /** Set when the holding gallery was deleted. A retired path is never
     *  re-issued: it is a URL that has been handed out in a class handout or a
     *  school newsletter, and pointing it at a stranger's gallery is worse than
     *  letting it die. */
    retiredAt?: number;
    /**
     * The folded path that replaced this one, when its gallery renamed.
     *
     * The reservation keeps pointing at the same gallery, so this is an *alias*
     * rather than a tombstone: the old URL still resolves, and nobody else can
     * take it. `retiredAt` is the other shape — nobody left to resolve to.
     */
    supersededBy?: string;
};

export function isGalleryPathReservation(
    value: unknown,
): value is GalleryPathReservation {
    return (
        isRecord(value) &&
        value.v === 1 &&
        (typeof value.gallery === 'string' || value.gallery === null) &&
        typeof value.path === 'string' &&
        typeof value.claimed === 'number' &&
        (value.retiredAt === undefined ||
            typeof value.retiredAt === 'number') &&
        (value.supersededBy === undefined ||
            typeof value.supersededBy === 'string')
    );
}

export type SetGalleryPathResult =
    | 'claimed'
    | 'cleared'
    | 'taken'
    | 'invalid'
    | 'missing'
    /** The gallery is not public and approved, so it may not choose a name. */
    | 'not-listed';

export type ReleaseGalleryPathResult =
    | 'released'
    | 'invalid'
    | 'missing'
    /** The reservation is gone, is another gallery's, or is a tombstone — all
     *  "this is not yours to give up", and the caller may not tell them apart:
     *  saying which would report on an index nobody may read. */
    | 'taken';

/**
 * Whether this gallery may take this reservation.
 *
 * A *superseded* reservation still points at its gallery, so a gallery taking
 * back a name it once held reads as 'own' — which is what we want, and what
 * distinguishes an alias from a tombstone. A retired one has a null gallery and
 * so is 'taken' forever, by nobody.
 */
export function galleryPathAction(
    held: GalleryPathReservation | undefined,
    galleryID: string,
): 'claim' | 'own' | 'taken' {
    if (held === undefined) return 'claim';
    return held.gallery === galleryID ? 'own' : 'taken';
}

/**
 * The alias list after a gallery stops answering to `retiring`.
 *
 * Newest first and capped, because this array rides on a document every visitor
 * reads. Dropping the oldest costs a stale redirect and never frees the name —
 * the reservation is what holds that, and only releaseGalleryPath gives one up.
 */
export function nextAliases(
    current: string[],
    retiring: string | null,
    /** The name the gallery now answers to, if any. Dropped from the list: a
     *  gallery that renamed away and back would otherwise hold one name as both
     *  its current path and an alias, and spend a slot saying so twice. */
    adopting: string | null = null,
): string[] {
    const kept = current.filter((alias) => alias !== adopting);
    if (retiring === null || retiring === adopting) return kept;
    return [retiring, ...kept.filter((alias) => alias !== retiring)].slice(
        0,
        MaxGalleryPathAliases,
    );
}

/**
 * The gallery's name fields after it gives `released` up for good.
 *
 * Releasing the current path does **not** leave it behind as an alias, the way
 * clearing does: it is being given up rather than superseded, and a redirect to
 * a name somebody else may now hold is the one outcome this must not produce.
 */
export function withoutName(
    path: string | null,
    aliases: string[],
    released: string,
): { path: string | null; pathAliases: string[] } {
    return {
        path: path === released ? null : path,
        pathAliases: aliases.filter((alias) => alias !== released),
    };
}

/** The gallery fields this module reads, checked rather than assumed. */
function galleryState(data: unknown): {
    isPublic: boolean;
    approved: boolean;
    path: string | null;
    aliases: string[];
    curators: string[];
} | null {
    if (!isRecord(data)) return null;
    return {
        isPublic: data.public === true,
        approved: data.moderation === 'approved',
        path: typeof data.path === 'string' ? data.path : null,
        aliases: isStringArray(data.pathAliases) ? data.pathAliases : [],
        curators: isStringArray(data.curators) ? data.curators : [],
    };
}

/** Who may choose a gallery's vanity path. Separate from the transaction so the
 *  callable can refuse before opening one. */
export async function galleryCurators(galleryID: string): Promise<string[]> {
    const snapshot = await getFirestore()
        .collection(GalleriesCollection)
        .doc(galleryID)
        .get();
    return galleryState(snapshot.data())?.curators ?? [];
}

/**
 * Give a gallery a vanity path, change the one it has, or take it away — one
 * verb, because all three are the same transaction over the same two documents
 * and splitting them would mean three copies of the reservation read.
 *
 * Idempotent for the same pair, so a retry after a dropped response does not
 * tell a curator their own name is taken.
 */
export async function setGalleryPath(
    galleryID: string,
    wanted: string | null,
): Promise<SetGalleryPathResult> {
    if (wanted !== null && !isValidGalleryPath(wanted)) return 'invalid';
    const db = getFirestore();
    const folded = wanted === null ? null : foldGalleryPath(wanted);
    const gallery = db.collection(GalleriesCollection).doc(galleryID);
    const reservation =
        folded === null
            ? null
            : db.collection(GalleryPathCollection).doc(folded);

    return db.runTransaction(async (transaction) => {
        // Every read before every write, which a Firestore transaction requires.
        const references =
            reservation === null ? [gallery] : [gallery, reservation];
        const snapshots = await transaction.getAll(...references);
        const state = galleryState(
            must(snapshots[0], 'the gallery snapshot').data(),
        );
        if (state === null) return 'missing';

        // Being public is the request and being approved is the decision; a
        // name is only ever chosen by a gallery a moderator has looked at. Note
        // that editing an approved gallery's content sends it back to 'pending'
        // while it stays public — so this refuses while the path it already has
        // keeps working, which is deliberate rather than a bug.
        if (!state.isPublic || !state.approved) return 'not-listed';

        const retiring = state.path;

        if (folded === null || reservation === null) {
            if (retiring === null) return 'cleared';
            transaction.set(
                gallery,
                {
                    path: null,
                    pathAliases: nextAliases(state.aliases, retiring),
                },
                { merge: true },
            );
            // The reservation stays pointed at this gallery, so the name is
            // still unclaimable by anyone else. Clearing is not giving it up:
            // releaseGalleryPath is the verb that does that, and it deletes the
            // reservation rather than leaving it here.
            return 'cleared';
        }

        if (retiring === folded) return 'claimed';

        const held = must(snapshots[1], 'the reservation snapshot').data();
        const parsed = isGalleryPathReservation(held) ? held : undefined;
        if (galleryPathAction(parsed, galleryID) === 'taken') return 'taken';

        transaction.set(reservation, {
            v: 1,
            gallery: galleryID,
            path: folded,
            claimed: parsed?.claimed ?? Date.now(),
        } satisfies GalleryPathReservation);

        if (retiring !== null)
            transaction.set(
                db.collection(GalleryPathCollection).doc(retiring),
                { supersededBy: folded },
                { merge: true },
            );

        transaction.set(
            gallery,
            {
                path: folded,
                pathAliases: nextAliases(state.aliases, retiring, folded),
            },
            { merge: true },
        );
        return 'claimed';
    });
}

/**
 * Give up one of a gallery's names, for good.
 *
 * Unlike clearing, this deletes the reservation, so the name goes back in the
 * pool and anyone may claim it. That is the point: a class that has finished
 * with `kim-p4` can hand it back rather than sitting on it forever. The cost is
 * the one the tombstone on a *deleted* gallery still avoids — a link already
 * handed out can end up pointing at a stranger's gallery — so this is only ever
 * a curator's deliberate act, never something that happens to them.
 *
 * Releasing the name a gallery currently answers to does not make it an alias:
 * it is being given up, not superseded, and keeping a redirect to a name
 * somebody else may now hold is exactly what must not happen.
 *
 * A name whose reservation outlived its alias entry — dropped past
 * MaxGalleryPathAliases, or left behind by a clear — is unreachable here,
 * because the gallery document no longer mentions it. Finding those needs a
 * query over `gallerypaths` by holder, which nothing does today.
 */
export async function releaseGalleryPath(
    galleryID: string,
    name: string,
): Promise<ReleaseGalleryPathResult> {
    if (!isValidGalleryPath(name)) return 'invalid';
    const db = getFirestore();
    const folded = foldGalleryPath(name);
    const gallery = db.collection(GalleriesCollection).doc(galleryID);
    const reservation = db.collection(GalleryPathCollection).doc(folded);

    return db.runTransaction(async (transaction) => {
        // Every read before every write, which a Firestore transaction requires.
        const snapshots = await transaction.getAll(gallery, reservation);
        const state = galleryState(
            must(snapshots[0], 'the gallery snapshot').data(),
        );
        if (state === null) return 'missing';

        // No isPublic/approved gate, unlike setGalleryPath. Choosing a name is
        // something only a listed gallery may do; giving one up must stay
        // possible for a gallery that has since gone private or been sent back
        // to the moderation queue, or a curator could be stuck holding a name
        // they no longer want.
        const held = must(snapshots[1], 'the reservation snapshot').data();
        const parsed = isGalleryPathReservation(held) ? held : undefined;
        // 'own' is the only answer that permits this: 'claim' means there is
        // nothing to release, and 'taken' covers both someone else's name and a
        // tombstone, whose null gallery matches no id.
        if (galleryPathAction(parsed, galleryID) !== 'own') return 'taken';

        transaction.delete(reservation);
        transaction.set(
            gallery,
            withoutName(state.path, state.aliases, folded),
            { merge: true },
        );
        return 'released';
    });
}

/**
 * Give up a gallery's names when the gallery goes away: every reservation is
 * kept as a tombstone rather than freed.
 *
 * Retiring rather than releasing, for the reason the type's `retiredAt` gives.
 * Called from the galleryEdited trigger's delete branch, so it covers a gallery
 * deleted by a script or the console as well as one deleted in the app.
 */
export async function retireGalleryPaths(
    path: string | null,
    aliases: string[],
): Promise<void> {
    const names = [...new Set([...(path === null ? [] : [path]), ...aliases])];
    if (names.length === 0) return;
    const db = getFirestore();
    const batch = db.batch();
    const retiredAt = Date.now();
    for (const name of names)
        batch.set(
            db.collection(GalleryPathCollection).doc(name),
            { gallery: null, retiredAt },
            { merge: true },
        );
    await batch.commit().catch((error) => {
        console.error('Could not retire a gallery path', error);
    });
}

/**
 * Whether each path could be claimed right now. Advisory — the transaction in
 * setGalleryPath is what actually decides — but it is what the gallery's path
 * field shows while someone types.
 */
export async function galleryPathsAvailable(
    paths: string[],
    galleryID: string,
): Promise<Record<string, boolean>> {
    const db = getFirestore();
    const answer: Record<string, boolean> = {};
    const checkable = paths.filter((path) => {
        if (!isValidGalleryPath(path)) {
            answer[path] = false;
            return false;
        }
        return true;
    });
    if (checkable.length === 0) return answer;

    const reservations = await db.getAll(
        ...checkable.map((path) =>
            db.collection(GalleryPathCollection).doc(foldGalleryPath(path)),
        ),
    );
    for (const [index, path] of checkable.entries()) {
        const held = reservations[index]?.data();
        const parsed = isGalleryPathReservation(held) ? held : undefined;
        answer[path] = galleryPathAction(parsed, galleryID) !== 'taken';
    }
    return answer;
}
