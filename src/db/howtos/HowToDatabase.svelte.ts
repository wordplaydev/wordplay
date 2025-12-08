/** This file encapsulates all Firebase how-to functionality and relies on Svelte state to cache how-to documents. */
import { type Database } from '@db/Database';
import { firestore } from '@db/firebase';
import type Gallery from '@db/galleries/Gallery';
import { FirebaseError } from 'firebase/app';
import type { Unsubscribe, User } from 'firebase/auth';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
    type Firestore
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

////////////////////////////////
// SCHEMAS
////////////////////////////////

const HowToSchemaV1 = z.object({
    /** Metadata */
    /** A UUID to help with identifying how-tos */
    id: z.string(),
    /** When the how-to was last edited */
    timestamp: z.number(),
    /** The gallery that this how-to corresponds to */
    galleryId: z.string(),
    /** If the how-to is published */
    published: z.boolean(),
    /** The coordinates of the how-to within the 2D space */
    xcoord: z.number(),
    ycoord: z.number(),

    /** Content and viewers */
    /** The title of the how-to */
    title: z.string(),
    /** The guiding question(s) for the how-to */
    guidingQuestions: z.array(z.string()),
    /** The text of the how-to, using Wordplay markup format */
    text: z.array(z.string()),
    /** The creator of the how-to */
    creator: z.string(),
    /** The list of users who can collaborate with the creator on a how-to */
    collaborators: z.array(z.string()),
    /** The list of users who can view the how-to */
    viewers: z.array(z.string()),
    /** Locales that the how-to depends on All ISO 639-1 languaage codes, followed by a -, followed by ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    locales: z.array(z.string()),

    /** Social interactions */
    /** The list of users who reacted to the how-to using each reaction */
    reactions: z.map(z.string(), z.array(z.string())),
    /** The list of projects who used the how-to */
    usedByProjects: z.array(z.string()),
    /** The ID of the chat corresponding to the how-to */
    chat: z.string().nullable(),
});

const HowToSchema = HowToSchemaV1;

export type HowToDocument = z.infer<typeof HowToSchemaV1>;

////////////////////////////////
// APIs
////////////////////////////////

/** An immutable wrapper class for accessing and manipulating how-to data */
export default class HowTo {
    /** The data of the how-to */
    private readonly data: HowToDocument;

    constructor(data: HowToDocument) {
        this.data = data;
    }

    getHowToId() {
        return this.data.id;
    }

    getHowToGalleryId() {
        return this.data.galleryId;
    }

    isPublished() {
        return this.data.published;
    }

    getCoordinates() {
        return [this.data.xcoord, this.data.ycoord];
    }

    getTitle() {
        return this.data.title;
    }

    getGuidingQuestions() {
        return this.data.guidingQuestions;
    }

    getText() {
        return this.data.text;
    }

    getCreator() {
        return this.data.creator;
    }

    getCollaborators() {
        return this.data.collaborators;
    }

    getViewers() {
        return this.data.viewers;
    }

    isViewer(user: string) {
        return this.data.viewers.includes(user);
    }

    getLocales() {
        return this.data.locales;
    }

    getAllowedReactions() {
        return this.data.reactions.keys();
    }

    getUserReactions() {
        return this.data.reactions;
    }

    getUsedByProjects() {
        return this.data.usedByProjects;
    }

    getChatId() {
        return this.data.chat;
    }

    getData() {
        return { ...this.data };
    }
}

////////////////////////////////
// CACHE
////////////////////////////////

const HowTosCollection = 'howtos';

export class HowToDatabase {
    private readonly db: Database;

    /** This is a global reactive map that stores how-tos obtained from Firestore 
     * maps gallery IDs to an array of HowTos that are associated with that gallery
    */
    private readonly howtos = $state(new SvelteMap<string, HowTo[]>());

    private unsubscribe: Unsubscribe | undefined = undefined;

    private galleryListener: (gallery: Gallery) => void;

    constructor(db: Database) {
        this.db = db;
        this.galleryListener = this.handleRevisedGallery.bind(this);
    }

    async updateHowTo(howTo: HowTo, persist: boolean) {
        const galleryId = howTo.getHowToGalleryId();

        // replace howTo in the cache
        const cachedHowTos = this.howtos.get(galleryId) || [];
        if (cachedHowTos.length === 0) {
            this.howtos.set(galleryId, [howTo]);
        } else {
            const index = cachedHowTos.findIndex(
                (ht) => ht.getHowToId() === howTo.getHowToId()
            );

            this.howtos.set(galleryId, [
                ...cachedHowTos.slice(0, index),
                howTo,
                ...cachedHowTos.slice(index + 1),
            ]);
        }

        // make sure we're listening to the gallery
        this.db.Galleries.listen(howTo.getHowToGalleryId(), this.galleryListener);

        // if asked to persist, update remotely
        if (persist && firestore) {
            await updateDoc(
                doc(firestore, HowTosCollection, galleryId, howTo.getHowToId()),
                howTo.getData(),
            );
        }
    }

    async deleteHowTo(howToId: string, galleryId: string) {
        this.howtos.set(galleryId, this.howtos.get(galleryId)?.filter((ht) => ht.getHowToId() !== howToId) ?? []);

        if (firestore) {
            try {
                await deleteDoc(doc(firestore, HowTosCollection, galleryId, howToId));
            } catch (err) {
                console.error(err);
            }
        }
    }

    syncUser() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user) this.listen(firestore, user);
    }

    async addHowTo(
        gallery: Gallery,
        xcoord: number,
        ycoord: number,
        collaborators: string[],
        title: string,
        guidingQuestions: string[],
        text: string[],
        locales: string[],
        reactionTypes: string[]
    ) {
        if (firestore === undefined) return undefined;
        const user = this.db.getUser()?.uid;
        if (user === null) return undefined;

        // create a new how-to
        const newHowTo: HowToDocument = {
            id: uuidv4(),
            timestamp: Date.now(),
            galleryId: gallery.getID(),
            published: false, // defaults to false
            xcoord: xcoord,
            ycoord: ycoord,
            title: title,
            guidingQuestions: guidingQuestions,
            text: text,
            creator: user as string,
            collaborators: collaborators,
            viewers: Array.from(
                new Set([
                    ...(gallery ? gallery.getCurators() : []),
                    ...(gallery ? gallery.getCreators() : []),
                    ...collaborators,
                ]),
            ),
            locales: locales,
            reactions: new Map<string, string[]>(
                reactionTypes.map((type) => [type, []])
            ),
            usedByProjects: [],
            chat: null,
        };

        // Add the how-to to Firebase, relying on the realtime listener to update the local cache.
        try {
            // create the document
            await setDoc(
                doc(firestore, HowTosCollection, newHowTo.galleryId, newHowTo.id),
                newHowTo
            );

            // add the how-to to the how-to cache, but not remotely; we just created it
            this.updateHowTo(new HowTo(newHowTo), false);

            // TODO(@mc): assuming that we don't need to add it to the gallery b/c gallery will pull from ID
        } catch (error) {
            console.error(error);
            return undefined;
        }

        return newHowTo.galleryId;
    }

    /** Should be called when a gallery updates, to synchronize chat participants */
    async handleRevisedGallery(gallery: Gallery) {
        // Synchronize the participants of all the projects in the gallery if this person is a curator of the gallery.
        // The user doesn't have permissions otherwise.
        const uid = this.db.getUser()?.uid;
        if (uid !== undefined && gallery.getCurators().includes(uid)) {
            this.syncViewers(gallery);
        }
    }

    /** Ensure how-to viewers include creator, collaborators, curators */
    syncViewers(gallery: Gallery) {
        for (const howTo of this.howtos.get(gallery.getID()) || []) {
            this.syncViewer(howTo.getHowToId(), gallery);
        }
    }

    private syncViewer(howToId: string, gallery: Gallery) {
        const howTo = this.howtos.get(gallery.getID())?.find(ht => ht.getHowToId() === howToId);

        if (!howTo) {
            console.error(`No how-to with ID ${howToId} found in the cache. Maybe a defect?`);
            return;
        }

        // get the list of viewers as a sorted string to quickly compare
        const currentViewersString = howTo.getViewers().sort().join();

        // get intended participants based on gallery
        const intendedParticipants = [
            ...new Set([
                ...gallery.getCurators(),
                ...gallery.getCreators(),
                ...howTo.getCollaborators(),
                ...howTo.getViewers(),
            ]),
        ].sort();

        if (currentViewersString !== intendedParticipants.join()) {
            // update the how-to with the new list of viewers
            this.updateHowTo(
                new HowTo({
                    ...howTo.getData(),
                    viewers: intendedParticipants,
                }),
                true,
            );
        }
    }

    /** Get a list of how-tos for a gallery. Empty if none exist. Undefined if gallery doesn't exist, false if there was an error.*/
    async getHowTos(gallery: Gallery): Promise<HowTo[] | undefined | false> {
        const galleryID = gallery.getID();
        if (galleryID === null) return undefined;

        // do we have the how-tos cached? return it.
        const howtos = this.howtos.get(galleryID);
        if (howtos) return howtos;

        // if not, see if it's in the database
        if (firestore === undefined) return undefined;
        try {
            const howToDocs = await getDocs(
                query(
                    collection(firestore, HowTosCollection),
                    where('galleryId', '==', galleryID),
                )
            );
            if (!howToDocs.empty) {
                const newHowTos = howToDocs.docs.map((doc) => {
                    const remoteHowTo = doc.data();

                    const newHowTo = new HowTo(remoteHowTo as HowToDocument);
                    // update the how to locally, but do not persist, we already know it is in the database
                    this.updateHowTo(newHowTo, false);

                    return newHowTo;
                });

                return newHowTos;
            } else {
                return undefined;
            }
        } catch (error) {
            return false;
        }
    }

    ignore() {
        if (this.unsubscribe) this.unsubscribe();
    }

    listen(firestore: Firestore, user: User) {
        this.ignore();
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, HowTosCollection),
                where('viewers', 'array-contains', user.uid),
            ),
            async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what how-to IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const howto = doc.data();

                    // try to parse the how-to and save on success.
                    try {
                        HowToSchema.parse(howto);
                        // Update the how-to in the local cache, but do not persist; we just got it from the DB.
                        this.updateHowTo(
                            new HowTo(howto as HowToDocument),
                            false,
                        )
                    } catch (error) {
                        // If the how-to doesn't succeed, then we don't save it.
                        console.error(error);
                    }
                });

                // TODO(@mc): dunno if this is working
                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the gallery.
                    // Stop litening to the gallery's changes if there are no how-tos remaining for that gallery
                    if (change.type === 'removed') {
                        const howToId = change.doc.id;
                        const galleryId = change.doc.data().galleryId;

                        this.howtos.set(galleryId, this.howtos.get(galleryId)?.filter((ht) => ht.getHowToId() !== howToId) ?? []);

                        if (this.howtos.get(galleryId)?.length === 0) {
                            this.howtos.delete(galleryId);

                            if (this.galleryListener) {
                                this.db.Galleries.ignore(howToId, this.galleryListener);
                            }
                        }
                    }
                });
            },
            (error) => {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            }
        );
    }
}
