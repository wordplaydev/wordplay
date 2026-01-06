////////////////////////////////
// SCHEMAS
////////////////////////////////

import { HowTos, type Database } from "@db/Database";
import { firestore } from '@db/firebase';
import type Gallery from "@db/galleries/Gallery";
import { FirebaseError } from 'firebase/app';
import type { User } from "firebase/auth";
import { collection, deleteDoc, doc, Firestore, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import { SvelteMap } from "svelte/reactivity";
import z from "zod";
import HowTo from "./HowToDatabase.svelte";

const HowToSocialSchemaV1 = z.object({
    /** version of the schema */
    v: z.literal(1),

    /** The how-to that these social interactions correspond to */
    howToId: z.string(),
    galleryId: z.string(),

    /** Those who have permissions to engage in social interactions with the how-to 
     * Redundant with who has permission to view the how-to
    */
    participants: z.array(z.string()),

    /** Social interactions */
    /** The list of users who reacted to the how-to using each reaction */
    reactionOptions: z.record(z.string(), z.string()),
    reactions: z.record(z.string(), z.array(z.string())),
    /** The list of projects who used the how-to */
    usedByProjects: z.array(z.string()),
    /** The ID of the chat corresponding to the how-to */
    chat: z.string().nullable(),
    /** The list of users who bookmarked the how-to */
    bookmarkers: z.array(z.string()),
    /** If the how-to was submitted for the team to review for inclusion in the global Guide */
    submittedToGuide: z.boolean(),
    /** The list of users who have seen the how-to */
    seenByUsers: z.array(z.string()),
})

const HowToSocialSchemaLatestVersion = 1;
const HowToSocialSchema = HowToSocialSchemaV1;

export type HowToSocialDocument = z.infer<typeof HowToSocialSchema>;

////////////////////////////////
// APIs
////////////////////////////////

/** An immutable wrapper class for accessing and manipulating how-to social data */
export default class HowToSocial {
    private readonly data: HowToSocialDocument;

    constructor(data: HowToSocialDocument) {
        this.data = data;
    }

    getHowToID() {
        return this.data.howToId;
    }

    getGalleryID() {
        return this.data.galleryId;
    }

    getParticipants() {
        return this.data.participants;
    }

    getReactionOptions() {
        return this.data.reactionOptions;
    }

    getReactions() {
        return this.data.reactions;
    }

    getNumReactions(reaction: string) {
        return this.data.reactions[reaction]?.length || 0;
    }

    didUserReact(userId: string, reaction: string) {
        return this.data.reactions[reaction]?.includes(userId) || false;
    }

    getUsedByProjects() {
        return this.data.usedByProjects;
    }

    getChatId() {
        return this.data.chat;
    }

    getBookmarkers() {
        return this.data.bookmarkers;
    }

    hasBookmarker(userId: string) {
        return this.data.bookmarkers.includes(userId);
    }

    getSubmittedToGuide() {
        return this.data.submittedToGuide;
    }

    getSeenByUsers() {
        return this.data.seenByUsers;
    }

    getData() {
        return this.data;
    }
}

////////////////////////////////
// CACHE
////////////////////////////////

const HowToSocialCollection = "howtosocials";

export class HowToSocialDatabase {
    private readonly db: Database;

    /** This is a global reactive map that stores howto social interactions from Firestore */
    private readonly howtoSocials = $state(new SvelteMap<string, HowToSocial>());

    private unsubscribe: Unsubscribe | undefined = undefined;

    private howToListener: (howTo: HowTo) => void;
    private galleryListener: (gallery: Gallery) => void;

    constructor(db: Database) {
        this.db = db;
        this.howToListener = this.handleRevisedHowTo.bind(this);
        this.galleryListener = this.handleRevisedGallery.bind(this);
    }

    async updateHowToSocial(howToSocial: HowToSocial, persist: boolean) {
        const howToId = howToSocial.getHowToID();

        // set the revised social data in the local state, propogating updates
        this.howtoSocials.set(howToId, howToSocial);

        if (persist && firestore) {
            await updateDoc(doc(firestore, HowToSocialCollection, howToId), howToSocial.getData());
        }
    }

    async deleteHowToSocial(howToId: string) {
        this.howtoSocials.delete(howToId);

        if (firestore) {
            try {
                await deleteDoc(doc(firestore, HowToSocialCollection, howToId));
            } catch (err) {
                console.error(err);
            }
        }
    }

    syncUser() {
        // if there is no firestore access, do nothing
        if (firestore === undefined) return;

        // if there is no user, do nothing
        const user = this.db.getUser();
        if (!user) return;

        // set up the realtime how-tos query for the user, tracking any how-tos from the cloud
        // and deleting any tracked locally that didn't appear in the snapshot
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, HowToSocialCollection),
                where("participants", "array-contains", user.uid)
            ), async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what how-to IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const howtoSocial = doc.data();

                    // try to parse the how-to and save on success.
                    try {
                        HowToSocialSchema.parse(howtoSocial);
                        // Update the how-to in the local cache, but do not persist; we just got it from the DB.
                        this.updateHowToSocial(
                            new HowToSocial(howtoSocial as HowToSocialDocument),
                            false,
                        )
                    } catch (error) {
                        // If the how-to doesn't succeed, then we don't save it.
                        console.error(error);
                    }
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        const howToId = change.doc.id;

                        this.howtoSocials.delete(howToId);
                    }
                });

            },
            (error) => {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            }
        )
    }

    async addHowToSocial(
        howToId: string,
        galleryId: string,
        participants: string[],
        reactionTypes: Record<string, string>
    ) {
        if (firestore === undefined) return undefined;
        const user = this.db.getUser()?.uid;

        if (user === null) return undefined;

        // create a new social interaction document
        const newHowToSocial: HowToSocialDocument = {
            v: HowToSocialSchemaLatestVersion,
            howToId: howToId,
            galleryId: galleryId,
            participants: participants,
            reactionOptions: reactionTypes,
            reactions: Object.fromEntries(new Map<string, string[]>(
                Object.keys(reactionTypes).map((emoji) => [emoji, []])
            )),
            usedByProjects: [],
            chat: null,
            bookmarkers: [],
            submittedToGuide: false,
            seenByUsers: [user as string],
        };

        // add the social data to Firebase, relying on realtime listener to update the local cache
        try {
            // create the document
            await setDoc(doc(firestore, HowToSocialCollection, howToId), newHowToSocial);

            // add the how-to social info to the cache, but not remotely, we just created it
            this.updateHowToSocial(new HowToSocial(newHowToSocial), false);
        } catch (error) {
            console.error(error);
            return undefined;
        }

        return this.getHowToSocial(howToId);
    }

    async handleRevisedHowTo(howTo: HowTo) {
        // sync participants if the viewers of the how-to have changed, only if the person is a owner or collaborator on the how-to
        const uid = this.db.getUser()?.uid;

        if (uid !== undefined && howTo.isCreatorCollaborator(uid)) {
            this.syncCollaborators(howTo);
        }
    }

    syncCollaborators(howTo: HowTo) {
        // ensure that the how-to social participants include the creator and collaborators
        const howToSocial = this.howtoSocials.get(howTo.getHowToId());

        if (howToSocial === undefined) {
            console.error(`No how-to with ID ${howTo.getHowToId()} found in the cache. Maybe a defect?`);
            return;
        }

        // get the list of Collaborators as a sorted string to quickly compare
        const currentCollaboratorsString = howToSocial.getParticipants().sort().join();

        // get intended participants based on gallery
        const intendedParticipants = [
            ...new Set([
                howTo.getCreator(),
                ...howTo.getCollaborators(),
                ...howToSocial.getParticipants(),
            ]),
        ].sort();

        if (currentCollaboratorsString !== intendedParticipants.join()) {
            // update the how-to with the new list of Collaborators
            this.updateHowToSocial(
                new HowToSocial({
                    ...howToSocial.getData(),
                    participants: intendedParticipants,
                }),
                true,
            );
        }
    }

    async handleRevisedGallery(gallery: Gallery) {
        // sync participants for all how-tos in the gallery if the viewers of the gallery have changed
        const uid = this.db.getUser()?.uid;

        if (uid !== undefined && gallery.isHowToViewer(uid)) {
            for (const howToId of HowTos.galleryHowTos.get(gallery.getID()) || []) {
                this.syncViewers(howToId, gallery);
            }
        }
    }

    syncViewers(howToId: string, gallery: Gallery) {
        // ensure that the how-to social participants include gallery how to viewers
        const howToSocial = this.howtoSocials.get(howToId);

        if (howToSocial === undefined) {
            console.error(`No how-to with ID ${howToId} found in the cache. Maybe a defect?`);
            return;
        }

        // get the list of Collaborators as a sorted string to quickly compare
        const currentParticipantsString = howToSocial.getParticipants().sort().join();

        // get intended participants based on gallery
        const intendedParticipants = [
            ...new Set([
                ...howToSocial.getParticipants(),
                ...gallery.getHowToViewers(),
            ]),
        ].sort();

        if (currentParticipantsString !== intendedParticipants.join()) {
            // update the how-to with the new list of Collaborators
            this.updateHowToSocial(
                new HowToSocial({
                    ...howToSocial.getData(),
                    participants: intendedParticipants,
                }),
                true,
            );
        }
    }

    async getHowToSocial(howToId: string): Promise<HowToSocial | undefined | false> {
        // do we have the social data cached? return it.
        const howToSocial = this.howtoSocials.get(howToId);
        if (howToSocial) return howToSocial;

        // if not, see if it's in the database
        if (firestore === undefined) return undefined;

        try {
            const howToSocialDoc = await getDoc(
                doc(firestore, HowToSocialCollection, howToId),
            );

            if (howToSocialDoc.exists()) {
                const howToSocialData = howToSocialDoc.data();
                if (howToSocialData === undefined) return undefined;

                const newSocial = new HowToSocial(howToSocialData as HowToSocialDocument);
                // update the doc locally but do not persist, we already know it's in the database
                this.updateHowToSocial(newSocial, false);

                return newSocial;
            } else return undefined;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async getHowToSocialsForGallery(galleryId: string): Promise<HowToSocial[] | undefined | false> {
        // do we have gallery data cached? return it
        const howToIds = HowTos.galleryHowTos.get(galleryId);

        if (howToIds) {
            let howToSocialData: HowToSocial[] = [];

            howToIds.forEach((howToId) => {
                let howToSocial = this.howtoSocials.get(howToId);
                if (howToSocial) {
                    howToSocialData.push(howToSocial);
                }
            })

            return howToSocialData;
        }

        // if not, see if it's in the database
        if (firestore === undefined) return undefined;

        try {
            const howToSocialDocs = await getDocs(
                query(
                    collection(firestore, HowToSocialCollection),
                    where('galleryId', '==', galleryId)
                )
            );

            if (!howToSocialDocs.empty) {
                const newSocialDocs = howToSocialDocs.docs.map((doc) => {
                    const remoteSocialDoc = doc.data();

                    const newSocial = new HowToSocial(remoteSocialDoc as HowToSocialDocument);
                    // update the doc locally but do not persist, we already know it's in the database
                    this.updateHowToSocial(newSocial, false);

                    return newSocial;
                });

                return newSocialDocs;
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
                collection(firestore, HowToSocialCollection),
                where('participants', 'array-contains', user.uid)
            ),
            async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what how-to IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const howtoSocial = doc.data();

                    // try to parse the how-to and save on success.
                    try {
                        HowToSocialSchema.parse(howtoSocial);
                        // Update the how-to in the local cache, but do not persist; we just got it from the DB.
                        this.updateHowToSocial(
                            new HowToSocial(howtoSocial as HowToSocialDocument),
                            false,
                        )
                    } catch (error) {
                        // If the how-to doesn't succeed, then we don't save it.
                        console.error(error);
                    }
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the gallery.
                    // Stop litening to the gallery's changes if there are no how-tos remaining for that gallery
                    if (change.type === 'removed') {
                        const howToId = change.doc.id;

                        this.howtoSocials.delete(howToId);
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