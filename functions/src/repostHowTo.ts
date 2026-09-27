import {
    FieldValue,
    getFirestore,
    type DocumentReference,
    type Firestore,
} from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    RepostHowToInputs,
    RepostHowToOutput,
    RepostHowToRefusal,
    UnrepostHowToInputs,
    UnrepostHowToOutput,
} from 'shared-types';
import { hasClaim } from './claims.js';
import { MaxHowToReposts } from './repostCap.js';
import { isRecord, isStringArray } from './shared/guards.js';

/**
 * Reposting a how-to into other galleries (#1065).
 *
 * A repost is a reference: one how-to document, shown in its home gallery
 * (`galleryId`, which still governs editing and deleting) and in each gallery
 * named in its `reposts`. The destination's `howTos` list gains its id too.
 *
 * Server-authoritative because security rules cannot loop. Whether someone may
 * read a reposted how-to depends on every gallery it is in, so the answer is
 * kept flat on the how-to — `repostReaders` and `repostedPublicly` — where the
 * read rule can test it without a get(), and where a list query can be proved
 * against it. Those are only trustworthy if no client writes them, so this
 * callable and the galleryEdited trigger are the only writers.
 */

export { MaxHowToReposts };

const HowTos = 'howtos';
const Galleries = 'galleries';
const Chats = 'chats';

/** What a gallery contributes to who may read a how-to reposted into it. */
export type RepostGallery = {
    public: boolean;
    curators: string[];
    creators: string[];
    howToExpandedVisibility: boolean;
    howToViewersFlat: string[];
};

/** A stored gallery as the part of it reposting depends on, or undefined. */
export function repostGalleryOf(data: unknown): RepostGallery | undefined {
    if (!isRecord(data)) return undefined;
    const list = (value: unknown) => (isStringArray(value) ? value : []);
    return {
        public: data.public === true,
        curators: list(data.curators),
        creators: list(data.creators),
        howToExpandedVisibility: data.howToExpandedVisibility === true,
        howToViewersFlat: list(data.howToViewersFlat),
    };
}

/** What the server keeps flat on a reposted how-to. */
export type RepostReaders = {
    repostReaders: string[];
    repostedPublicly: boolean;
};

/**
 * Who the galleries a how-to was reposted into let read it: each one's members,
 * and its expanded-access viewers unless this how-to opted out of expanded
 * access — the same grants its home gallery makes. **Sorted** and deduplicated,
 * since this is diffed against what is stored to decide whether to write, and
 * an unstable order is a trigger that rewrites its own document forever.
 */
export function deriveRepostReaders(
    scopeOverwrite: boolean,
    galleries: RepostGallery[],
): RepostReaders {
    const readers = new Set<string>();
    for (const gallery of galleries) {
        for (const uid of gallery.curators) readers.add(uid);
        for (const uid of gallery.creators) readers.add(uid);
        if (gallery.howToExpandedVisibility && !scopeOverwrite)
            for (const uid of gallery.howToViewersFlat) readers.add(uid);
    }
    return {
        repostReaders: [...readers].sort(),
        repostedPublicly: galleries.some((gallery) => gallery.public),
    };
}

/** Whether what is stored already says what was derived. */
export function repostReadersChanged(
    stored: Record<string, unknown>,
    derived: RepostReaders,
): boolean {
    const readers = isStringArray(stored.repostReaders)
        ? stored.repostReaders
        : [];
    return (
        stored.repostedPublicly !== derived.repostedPublicly ||
        readers.length !== derived.repostReaders.length ||
        readers.some((uid, index) => uid !== derived.repostReaders[index])
    );
}

/**
 * Everyone in the conversation about a how-to: its authors, its home gallery's
 * members and expanded viewers, and everyone a repost lets in. The client's
 * `howToChatParticipants` in src/db/howtos/howToAccess.ts states the same union.
 */
export function howToChatParticipants(
    howTo: Record<string, unknown>,
    home: RepostGallery | undefined,
    repostReaders: string[],
): string[] {
    const people = new Set<string>();
    if (typeof howTo.creator === 'string') people.add(howTo.creator);
    if (isStringArray(howTo.collaborators))
        for (const uid of howTo.collaborators) people.add(uid);
    if (home) {
        for (const uid of [...home.curators, ...home.creators]) people.add(uid);
        if (home.howToExpandedVisibility && howTo.scopeOverwrite !== true)
            for (const uid of home.howToViewersFlat) people.add(uid);
    }
    for (const uid of repostReaders) people.add(uid);
    return [...people].sort();
}

/** The facts a repost decision is made from. */
export type RepostFacts = {
    uid: string;
    banned: boolean;
    howTo: Record<string, unknown>;
    home: RepostGallery | undefined;
    destinationID: string;
    destination: RepostGallery | undefined;
};

function repostsOf(howTo: Record<string, unknown>): string[] {
    return isStringArray(howTo.reposts) ? howTo.reposts : [];
}

function editsHowTo(
    uid: string,
    howTo: Record<string, unknown>,
    home: RepostGallery | undefined,
): boolean {
    return (
        howTo.creator === uid ||
        (isStringArray(howTo.collaborators) &&
            howTo.collaborators.includes(uid)) ||
        (home !== undefined && home.curators.includes(uid))
    );
}

/**
 * Why a repost may not happen, or undefined when it may. The client's
 * `canRepostHowTo` asks the same questions to decide whether to offer it.
 */
export function repostRefusal(
    facts: RepostFacts,
): RepostHowToRefusal | undefined {
    const { uid, howTo, home, destinationID, destination } = facts;
    if (destination === undefined) return 'missing';
    if (howTo.published !== true) return 'unpublished';
    if (howTo.galleryId === destinationID) return 'home';
    const reposts = repostsOf(howTo);
    if (reposts.includes(destinationID)) return 'already';
    if (reposts.length >= MaxHowToReposts) return 'too-many';
    if (!editsHowTo(uid, howTo, home)) return 'not-editor';
    if (!destination.curators.includes(uid)) return 'not-curator';
    // The same ban the rules put on making a how-to public (#193): a public
    // destination would make it world-readable.
    if (facts.banned && destination.public) return 'banned';
    return undefined;
}

/** Whether this person may take the how-to back out of the destination. */
export function mayUnrepost(facts: RepostFacts): boolean {
    const { uid, howTo, home, destination } = facts;
    return (
        (destination !== undefined && destination.curators.includes(uid)) ||
        editsHowTo(uid, howTo, home)
    );
}

/** A finite coordinate from a client, or the origin. */
function coordinate(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Read the galleries a how-to is reposted into, in `reposts` order. */
async function readRepostGalleries(
    db: Firestore,
    read: (refs: DocumentReference[]) => Promise<{ data(): unknown }[]>,
    reposts: string[],
): Promise<RepostGallery[]> {
    if (reposts.length === 0) return [];
    const docs = await read(
        reposts.map((id) => db.collection(Galleries).doc(id)),
    );
    return docs
        .map((doc) => repostGalleryOf(doc.data()))
        .filter((gallery): gallery is RepostGallery => gallery !== undefined);
}

export async function repostHowTo(
    request: CallableRequest<RepostHowToInputs>,
): Promise<RepostHowToOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined) return { error: 'unauthenticated' };
    const howToID = request.data?.howTo;
    const destinationID = request.data?.gallery;
    if (
        typeof howToID !== 'string' ||
        howToID.length === 0 ||
        typeof destinationID !== 'string' ||
        destinationID.length === 0
    )
        return { error: 'missing' };

    const db = getFirestore();
    try {
        return await db.runTransaction(async (tx) => {
            const howToRef = db.collection(HowTos).doc(howToID);
            const howTo = (await tx.get(howToRef)).data();
            if (howTo === undefined) return { error: 'missing' };
            const homeID =
                typeof howTo.galleryId === 'string' ? howTo.galleryId : '';
            const [homeDoc, destinationDoc] = await tx.getAll(
                db.collection(Galleries).doc(homeID || destinationID),
                db.collection(Galleries).doc(destinationID),
            );
            const home = homeID ? repostGalleryOf(homeDoc?.data()) : undefined;
            const destination = repostGalleryOf(destinationDoc?.data());
            const refusal = repostRefusal({
                uid,
                banned: hasClaim(request.auth?.token, 'banned'),
                howTo,
                home,
                destinationID,
                destination,
            });
            if (refusal !== undefined) return { error: refusal };

            const reposts = [...repostsOf(howTo), destinationID];
            const galleries = await readRepostGalleries(
                db,
                (refs) => tx.getAll(...refs),
                reposts,
            );
            const derived = deriveRepostReaders(
                howTo.scopeOverwrite === true,
                galleries,
            );
            const chatID = isRecord(howTo.social) ? howTo.social.chat : null;
            const chatRef =
                typeof chatID === 'string'
                    ? db.collection(Chats).doc(chatID)
                    : undefined;
            const chat = chatRef ? (await tx.get(chatRef)).exists : false;

            tx.update(howToRef, {
                reposts,
                ...derived,
                [`repostPlacements.${destinationID}`]: {
                    x: coordinate(request.data.x),
                    y: coordinate(request.data.y),
                },
            });
            tx.update(db.collection(Galleries).doc(destinationID), {
                howTos: FieldValue.arrayUnion(howToID),
            });
            // The destination's members can now read it, so they belong in the
            // conversation about it too.
            if (chatRef && chat)
                tx.update(chatRef, {
                    participants: howToChatParticipants(
                        howTo,
                        home,
                        derived.repostReaders,
                    ),
                });
            return { reposted: true };
        });
    } catch (error) {
        console.error('Could not repost a how-to', error);
        return { error: 'failed' };
    }
}

export async function unrepostHowTo(
    request: CallableRequest<UnrepostHowToInputs>,
): Promise<UnrepostHowToOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined) return { error: 'unauthenticated' };
    const howToID = request.data?.howTo;
    const destinationID = request.data?.gallery;
    if (
        typeof howToID !== 'string' ||
        howToID.length === 0 ||
        typeof destinationID !== 'string' ||
        destinationID.length === 0
    )
        return { error: 'missing' };

    const db = getFirestore();
    try {
        return await db.runTransaction(async (tx) => {
            const howToRef = db.collection(HowTos).doc(howToID);
            const howTo = (await tx.get(howToRef)).data();
            if (howTo === undefined) return { error: 'missing' };
            if (!repostsOf(howTo).includes(destinationID))
                return { error: 'not-reposted' };
            const homeID =
                typeof howTo.galleryId === 'string' ? howTo.galleryId : '';
            const [homeDoc, destinationDoc] = await tx.getAll(
                db.collection(Galleries).doc(homeID || destinationID),
                db.collection(Galleries).doc(destinationID),
            );
            const home = homeID ? repostGalleryOf(homeDoc?.data()) : undefined;
            const destination = repostGalleryOf(destinationDoc?.data());
            if (
                !mayUnrepost({
                    uid,
                    banned: false,
                    howTo,
                    home,
                    destinationID,
                    destination,
                })
            )
                return { error: 'not-allowed' };

            const updates = await withoutRepost(
                db,
                (refs) => tx.getAll(...refs),
                howTo,
                home,
                destinationID,
            );
            const chatRef = updates.chat
                ? db.collection(Chats).doc(updates.chat.id)
                : undefined;
            const chatExists = chatRef ? (await tx.get(chatRef)).exists : false;
            tx.update(howToRef, updates.howTo);
            if (destinationDoc?.exists)
                tx.update(db.collection(Galleries).doc(destinationID), {
                    howTos: FieldValue.arrayRemove(howToID),
                });
            if (chatRef && chatExists && updates.chat)
                tx.update(chatRef, {
                    participants: updates.chat.participants,
                });
            return { unreposted: true };
        });
    } catch (error) {
        console.error('Could not remove a repost', error);
        return { error: 'failed' };
    }
}

/**
 * The writes that take one gallery out of a how-to's reposts: the list, the
 * readers derived from what is left, the placement, and the chat's
 * participants. Shared by unrepostHowTo and by galleryEdited when a gallery a
 * how-to was reposted into is deleted.
 */
export async function withoutRepost(
    db: Firestore,
    read: (refs: DocumentReference[]) => Promise<{ data(): unknown }[]>,
    howTo: Record<string, unknown>,
    home: RepostGallery | undefined,
    galleryID: string,
): Promise<{
    howTo: Record<string, unknown>;
    chat: { id: string; participants: string[] } | undefined;
}> {
    const reposts = repostsOf(howTo).filter((id) => id !== galleryID);
    const galleries = await readRepostGalleries(db, read, reposts);
    const derived = deriveRepostReaders(
        howTo.scopeOverwrite === true,
        galleries,
    );
    const chatID = isRecord(howTo.social) ? howTo.social.chat : null;
    return {
        howTo: {
            reposts,
            ...derived,
            [`repostPlacements.${galleryID}`]: FieldValue.delete(),
        },
        chat:
            typeof chatID === 'string'
                ? {
                      id: chatID,
                      participants: howToChatParticipants(
                          howTo,
                          home,
                          derived.repostReaders,
                      ),
                  }
                : undefined,
    };
}

/**
 * Re-derive who may read each how-to reposted into a gallery, after that
 * gallery's membership, visibility or expanded viewers changed — or, when
 * `deleted`, take it out of their reposts entirely. Returns the writes to make,
 * for galleryEdited to batch with its own; a how-to whose readers did not move
 * gets none, since each write here comes back through howToEdited.
 */
export async function refreshRepostsInto(
    db: Firestore,
    galleryID: string,
    deleted: boolean,
): Promise<{ ref: DocumentReference; data: Record<string, unknown> }[]> {
    const reposted = await db
        .collection(HowTos)
        .where('reposts', 'array-contains', galleryID)
        .get();
    const updates: { ref: DocumentReference; data: Record<string, unknown> }[] =
        [];
    const read = (refs: DocumentReference[]) => db.getAll(...refs);
    for (const doc of reposted.docs) {
        const howTo = doc.data();
        const homeID =
            typeof howTo.galleryId === 'string' ? howTo.galleryId : '';
        const home = homeID
            ? repostGalleryOf(
                  (await db.collection(Galleries).doc(homeID).get()).data(),
              )
            : undefined;
        if (deleted) {
            const next = await withoutRepost(db, read, howTo, home, galleryID);
            updates.push({ ref: doc.ref, data: next.howTo });
            if (next.chat)
                updates.push(
                    ...(await chatUpdate(
                        db,
                        next.chat.id,
                        next.chat.participants,
                    )),
                );
            continue;
        }
        const derived = deriveRepostReaders(
            howTo.scopeOverwrite === true,
            await readRepostGalleries(db, read, repostsOf(howTo)),
        );
        if (!repostReadersChanged(howTo, derived)) continue;
        updates.push({ ref: doc.ref, data: { ...derived } });
        const chatID = isRecord(howTo.social) ? howTo.social.chat : null;
        if (typeof chatID === 'string')
            updates.push(
                ...(await chatUpdate(
                    db,
                    chatID,
                    howToChatParticipants(howTo, home, derived.repostReaders),
                )),
            );
    }
    return updates;
}

/** A chat participants write, if the chat is there to take it. */
async function chatUpdate(
    db: Firestore,
    chatID: string,
    participants: string[],
): Promise<{ ref: DocumentReference; data: Record<string, unknown> }[]> {
    const ref = db.collection(Chats).doc(chatID);
    return (await ref.get()).exists ? [{ ref, data: { participants } }] : [];
}

/**
 * Re-derive one how-to's repost readers, when something on the how-to itself
 * changed what they are (its `scopeOverwrite`). Undefined when nothing moved.
 */
export async function rederiveRepostReaders(
    db: Firestore,
    howTo: Record<string, unknown>,
): Promise<RepostReaders | undefined> {
    const derived = deriveRepostReaders(
        howTo.scopeOverwrite === true,
        await readRepostGalleries(
            db,
            (refs) => db.getAll(...refs),
            repostsOf(howTo),
        ),
    );
    return repostReadersChanged(howTo, derived) ? derived : undefined;
}
