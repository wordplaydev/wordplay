import type { Firestore } from 'firebase-admin/firestore';
import type { ReportSubjectKind, Visibility } from 'shared-types';

const Projects = 'projects';
const Galleries = 'galleries';
const HowTos = 'howtos';
const Chats = 'chats';

/** What a thing amounts to, once its document and its gallery have been read. */
export type Subject = {
    visibility: Visibility;
    /** Who made it, for addressing a decision. Null when nothing did — a
     *  gallery is curated rather than authored. */
    author: string | null;
    /** Whether someone can see the thing at all. */
    visibleTo: (uid: string) => boolean;
    /** A label for a notice, captured now because the thing may be gone, or
     *  unreadable, by the time anyone reads about it. */
    title: string;
};

/** Whether a uid appears in a field that is supposed to be a list of them. */
function listed(value: unknown, uid: string): boolean {
    return Array.isArray(value) && value.includes(uid);
}

/**
 * Read a reportable thing and say what its visibility amounts to.
 *
 * Shared by `report` and `moderate` so the two can never disagree about who is
 * responsible for something — the report routes by it and the decision
 * authorizes by it, and a divergence would let one accept what the other
 * refuses.
 */
export default async function describeSubject(
    db: Firestore,
    kind: ReportSubjectKind,
    id: string,
    messageID?: string,
): Promise<Subject | undefined> {
    if (kind === 'chat') {
        const chat = (await db.collection(Chats).doc(id).get()).data();
        if (chat === undefined) return undefined;
        const participants: string[] = chat.participants ?? [];
        // A chat inherits the visibility of what it is about, so the parent
        // answers that — but only a participant can see the conversation,
        // whatever the parent's wider audience is.
        const parent = await describeSubject(
            db,
            chat.type === 'howto' ? 'howto' : 'project',
            chat.project,
        );
        if (parent === undefined) return undefined;
        // A report about the conversation rather than one message.
        if (messageID === undefined)
            return {
                visibility: parent.visibility,
                author: null,
                visibleTo: (who) => participants.includes(who),
                title: parent.title,
            };
        const said = (chat.messages ?? []).find(
            (m: { id?: string }) => m.id === messageID,
        );
        if (said === undefined) return undefined;
        return {
            visibility: parent.visibility,
            author: typeof said.creator === 'string' ? said.creator : null,
            visibleTo: (who) => participants.includes(who),
            title: parent.title,
        };
    }

    if (kind === 'gallery') {
        const gallery = (await db.collection(Galleries).doc(id).get()).data();
        if (gallery === undefined) return undefined;
        const members = [
            ...(gallery.curators ?? []),
            ...(gallery.creators ?? []),
        ];
        return {
            visibility: {
                public: gallery.public === true,
                gallery: id,
                galleryPublic: gallery.public === true,
                galleryMembers: members,
                // A gallery is curated rather than authored, so there is nobody
                // to address a decision to and nobody whose own report to
                // refuse.
                owner: null,
            },
            author: null,
            visibleTo: (who) =>
                gallery.public === true || members.includes(who),
            title: firstName(gallery.name),
        };
    }

    const collection = kind === 'howto' ? HowTos : Projects;
    const thing = (await db.collection(collection).doc(id).get()).data();
    if (thing === undefined) return undefined;

    const galleryID: string | null =
        (kind === 'howto' ? thing.galleryId : thing.gallery) ?? null;
    const gallery =
        galleryID === null
            ? undefined
            : (await db.collection(Galleries).doc(galleryID).get()).data();
    const members = gallery
        ? [...(gallery.curators ?? []), ...(gallery.creators ?? [])]
        : [];
    const owner: string | null =
        (kind === 'howto' ? thing.creator : thing.owner) ?? null;
    const isPublic =
        kind === 'howto' ? thing.isPublic === true : thing.public === true;

    return {
        visibility: {
            public: isPublic,
            gallery: galleryID,
            galleryPublic: gallery?.public === true,
            galleryMembers: members,
            owner,
        },
        author: owner,
        // Every list is checked with Array.isArray first: a how-to's `viewers`
        // is a map of gallery id to uids, not an array, so a bare `.includes`
        // would throw on exactly the kind we most need to read.
        visibleTo: (who) =>
            isPublic ||
            who === owner ||
            listed(thing.collaborators, who) ||
            listed(thing.commenters, who) ||
            listed(thing.viewers, who) ||
            listed(thing.viewersFlat, who) ||
            members.includes(who),
        title:
            typeof thing.title === 'string' ? thing.title : (thing.name ?? ''),
    };
}

/** A gallery's or how-to's name is per-locale; a notice needs one string. */
function firstName(name: unknown): string {
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name !== null) {
        const values = Object.values(name);
        const first = values.find((value) => typeof value === 'string');
        if (typeof first === 'string') return first;
    }
    return '';
}

/** The curators of a gallery, who route a report to the people responsible. */
export async function curatorsOf(db: Firestore, id: string): Promise<string[]> {
    const gallery = (await db.collection(Galleries).doc(id).get()).data();
    const curators = gallery?.curators;
    return Array.isArray(curators) ? curators : [];
}
