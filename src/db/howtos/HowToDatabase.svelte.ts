/** This file encapsulates all Firebase how-to functionality and relies on Svelte state to cache how-to documents. */
import type { NotificationData } from '@components/settings/Notifications.svelte';
import { type Database } from '@db/Database';
import { firestore } from '@db/firebase';
import type Gallery from '@db/galleries/Gallery';
import { SupportedLocales } from '@locale/SupportedLocales';
import { FirebaseError } from 'firebase/app';
import {
    and,
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    or,
    query,
    setDoc,
    updateDoc,
    where,
    type Firestore,
    type Unsubscribe,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { notifications } from '../../routes/+layout.svelte';

////////////////////////////////
// SCHEMAS
////////////////////////////////

const HowToSocialSchemaV1 = z.object({
    /** version of the schema */
    v: z.literal(1),

    /** Social interactions */
    /** Whether the creator chooses to notify subscribers when this is published */
    notifySubscribers: z.boolean(),
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
    /** The number of times that the how-to has been viewed (one user can view it multiple times, or a viewer may not be logged in) */
    viewCount: z.number(),
});

const HowToSocialSchemaLatestVersion = 1;
const HowToSocialSchema = HowToSocialSchemaV1;

export type HowToSocialDocument = z.infer<typeof HowToSocialSchema>;

const HowToSchemaV1 = z.object({
    /** Metadata */
    /** version of the schema */
    v: z.literal(1),
    /** A UUID to help with identifying how-tos */
    id: z.string(),
    /** The gallery that this how-to corresponds to */
    galleryId: z.string(),
    /** If the how-to is published */
    published: z.boolean(),
    /** Timestamp of publishing */
    publishedAt: z.number().nullable(),
    /** The coordinates of the how-to within the 2D space */
    xcoord: z.number(),
    ycoord: z.number(),

    /** Content and collaborators */
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
    /** The list of users who can view a how-to and interact with its social features
     * Organized as a map from gallery ID to list of user IDs, where the gallery ID is the gallery that grants the viewer access since it is a gallery by the same curator
     */
    viewers: z.record(z.string(), z.array(z.string())),
    /** Flat version of viewers, calculated in a firestore function, for firestore rule queries */
    viewersFlat: z.array(z.string()),
    /** True if the user restricts access to the how-to to only those who have direct access to the gallery
     * I.e., overwrites the gallery curator "expanding" how-to viewing permissions
     */
    scopeOverwrite: z.boolean(),
    /** Locales that the how-to depends on All ISO 639-1 languaage codes, followed by a -, followed by ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    locales: z.array(z.string()),

    /** Social content */
    social: HowToSocialSchema,
});

const HowToSchemaLatestVersion = 1;
const HowToSchema = HowToSchemaV1;

export type HowToDocument = z.infer<typeof HowToSchema>;

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

    getPublishedAt() {
        return this.data.publishedAt;
    }

    getCoordinates() {
        return [this.data.xcoord, this.data.ycoord];
    }

    inCanvasArea(xmin: number, xmax: number, ymin: number, ymax: number) {
        const buffer = 100; // extra buffer to load how-tos just outside the canvas

        return (
            this.data.xcoord >= xmin - buffer &&
            this.data.xcoord <= xmax + buffer &&
            this.data.ycoord >= ymin - buffer &&
            this.data.ycoord <= ymax + buffer
        );
    }

    getTitle() {
        return this.data.title;
    }

    getTitleAsMap(): SvelteMap<string, string[]> {
        return this.markupToMapHelper([this.data.title]);
    }

    /** Get the title of the how-to in the specified locale. If there is no title written in that language, fall back to the first title */
    getTitleInLocale(locale: string): string {
        const titleMap = this.getTitleAsMap();
        let nameInLocale: string[] | undefined = titleMap.get(locale);
        if (nameInLocale) return nameInLocale[0];

        let firstLanguage: [string, string[]] | undefined = titleMap.entries().next().value;
        if (firstLanguage) return firstLanguage[1][0];
        else return ''; // fall back to an empty title
    }

    getGuidingQuestions() {
        return this.data.guidingQuestions;
    }

    getText() {
        return this.data.text;
    }

    private markupToMapHelper(markup: string[]): SvelteMap<string, string[]> {
        // input format: ['¶hello¶/en-US¶hola¶/es-MX', '¶bye¶/en-US¶adios¶/es-MX']
        // output format: {'en-US': ['hello', 'bye'], 'es-MX': ['hola', 'adios']}
        let map: SvelteMap<string, string[]> = new SvelteMap<
            string,
            string[]
        >();

        // should match strings in the format of "¶some text¶/locale", where the locale is one of the supported locales
        // necessary, since not all locales match the {2,3}-{2,3} format (e.g., ta-IN-LK-SG)
        let regexString: string = "¶(.*?)¶\/(" + SupportedLocales.join("|") + ")";
        let regex: RegExp = new RegExp(regexString, "gs");

        markup.forEach((m) => {
            let stringAndLocale: RegExpExecArray[] = [...m.matchAll(regex)];

            // dealing with cases of no markup, just text (i.e., how-to was created before translation was implemented)
            // 'en-US' was the hard-coded default locale, so we just use that
            if (stringAndLocale.length === 0) {
                map.set('en-US', [m]);
                return;
            }

            stringAndLocale.forEach((match) => {
                let locale: string = match[2];
                let text: string = match[1];

                if (map.has(locale)) {
                    map.get(locale)?.push(text);
                } else {
                    map.set(locale, [text]);
                }
            });
        });

        return map;
    }

    /** Converts the text of the how-to in to a map of locales to string lists (for each) */
    getTextAsMap(): SvelteMap<string, string[]> {
        return this.markupToMapHelper(this.data.text);
    }

    /** Converts the map of locales to string lists back to the text format of the how-to (first return value is a list of locales) */
    static mapToMarkupHelper(userInput: SvelteMap<string, string[]>,
        length: number
    ): [string[], string[]] {
        let usedLocales: Set<string> = new Set<string>();
        let markupTexts: string[] = Array(length).fill('');

        // input format: {'en-US': ['hello', 'bye'], 'es-MX': ['hola', 'adios']}
        // output format: ['¶hello¶/en-US¶hola¶/es-MX', '¶bye¶/en-US¶adios¶/es-MX']
        // also need to account for code, e.g., "some text, \Phrase('some code')\" --> "¶some text, ¶\Phrase('some code')\/en-US"
        userInput.entries().forEach(([locale, text]) => {
            if (text.every((t) => t.length === 0)) return; // if all the text for this locale is empty, skip it

            usedLocales.add(locale);
            text.forEach((str, i) => {
                markupTexts[i] += `¶${str}¶/${locale}`;
            });
        });

        return [[...usedLocales], markupTexts];
    };

    getCreator() {
        return this.data.creator;
    }

    getCollaborators() {
        return this.data.collaborators;
    }

    isCreatorCollaborator(userId: string) {
        return (
            this.data.creator === userId ||
            this.data.collaborators.includes(userId)
        );
    }

    getViewers() {
        return this.data.viewersFlat;
    }

    hasViewer(userId: string) {
        return this.data.viewersFlat.includes(userId);
    }

    getLocales(): string[] {
        return this.data.locales;
    }

    getSocial() {
        return this.data.social;
    }

    getNotifySubscribers() {
        return this.data.social.notifySubscribers;
    }

    getReactionOptions() {
        return this.data.social.reactionOptions;
    }

    getReactions() {
        return this.data.social.reactions;
    }

    getNumReactions(reaction: string) {
        return this.data.social.reactions[reaction]?.length || 0;
    }

    didUserReact(userId: string, reaction: string) {
        return this.data.social.reactions[reaction]?.includes(userId) || false;
    }

    getUsedByProjects() {
        return this.data.social.usedByProjects;
    }

    getChatId() {
        return this.data.social.chat;
    }

    getBookmarkers() {
        return this.data.social.bookmarkers;
    }

    hasBookmarker(userId: string) {
        return this.data.social.bookmarkers.includes(userId);
    }

    getSubmittedToGuide() {
        return this.data.social.submittedToGuide;
    }

    getSeenByUsers() {
        return this.data.social.seenByUsers;
    }

    getViewCount() {
        return this.data.social.viewCount;
    }

    getScopeOverwrite() {
        return this.data.scopeOverwrite;
    }

    getData() {
        return { ...this.data };
    }
}

////////////////////////////////
// CACHE
////////////////////////////////

export const HowTosCollection = 'howtos';

export class HowToDatabase {
    private readonly db: Database;

    /** This is a global reactive map that stores howtos obtained from Firestore */
    private readonly howtos = $state(new SvelteMap<string, HowTo>());

    /** All of the how-tos that the user can edit (as a creator or collaborator) */
    readonly allEditableHowTos: HowTo[] = $derived([
        ...Array.from(this.howtos.values()).filter((howto) => {
            const user = this.db.getUser();
            if (user === null) return false;
            return howto.isCreatorCollaborator(user.uid);
        }),
    ]);

    /** All of the how-tos that the user has view or write access to (basically the values of howtos) */
    readonly allAccessiblePublishedHowTos: HowTo[] = $derived([
        ...Array.from(this.howtos.values()).filter((ht) => ht.isPublished()),
    ]);

    /** Maps how-to IDs to listeners that need to be notified when a change is made to the how-to */
    private listeners = new Map<string, Set<(howTo: HowTo) => void>>();

    private unsubscribe: Unsubscribe | undefined = undefined;

    constructor(db: Database) {
        this.db = db;
    }

    async updateHowTo(howTo: HowTo, persist: boolean) {
        const howToID = howTo.getHowToId();

        // if published as a result of this update, then set publishedAt time
        if (howTo.isPublished() && howTo.getPublishedAt() === null) {
            howTo = new HowTo({
                ...howTo.getData(),
                publishedAt: Date.now(),
            });
        }

        // set the revised how-to in the local state, propogating updates
        this.howtos.set(howToID, howTo);

        // notify the listeners for this how-to
        this.listeners.get(howToID)?.forEach((listener) => {
            listener(howTo);
        });

        // if asked to persist, update remotely
        if (persist && firestore) {
            await updateDoc(
                doc(firestore, HowTosCollection, howToID),
                howTo.getData(),
            );
        }
    }

    async deleteHowTo(howToId: string, gallery: Gallery) {
        this.howtos.delete(howToId);

        if (firestore) {
            try {
                await deleteDoc(doc(firestore, HowTosCollection, howToId));

                // remove the how-to's ID from the gallery's list of how-to IDs
                this.db.Galleries.edit(gallery.withoutHowTo(howToId));
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

        this.listen(firestore, user.uid);
    }

    async addHowTo(
        gallery: Gallery,
        published: boolean,
        xcoord: number,
        ycoord: number,
        collaborators: string[],
        title: string,
        guidingQuestions: string[],
        text: string[],
        locales: string[],
        reactionTypes: Record<string, string>,
        notify: boolean,
        overwriteAccessScope: boolean,
    ): Promise<HowTo | undefined | false> {
        if (firestore === undefined) return undefined;
        const user = this.db.getUser()?.uid;
        if (user === null) return undefined;

        // create a new social interaction document
        const newHowToSocial: HowToSocialDocument = {
            v: HowToSocialSchemaLatestVersion,
            notifySubscribers: notify,
            reactionOptions: reactionTypes,
            reactions: Object.fromEntries(
                new Map<string, string[]>(
                    Object.keys(reactionTypes).map((emoji) => [emoji, []]),
                ),
            ),
            usedByProjects: [],
            chat: null,
            bookmarkers: [],
            submittedToGuide: false,
            seenByUsers: [user as string],
            viewCount: 0,
        };

        // create a new how-to
        const newHowTo: HowToDocument = {
            v: HowToSchemaLatestVersion,
            id: uuidv4(),
            galleryId: gallery.getID(),
            published: published, // defaults to false
            publishedAt: published ? Date.now() : null,
            xcoord: xcoord,
            ycoord: ycoord,
            title: title,
            guidingQuestions: guidingQuestions,
            text: text,
            creator: user as string,
            collaborators: collaborators,
            viewers: {} as Record<string, string[]>,
            viewersFlat: [] as string[],
            scopeOverwrite: overwriteAccessScope,
            locales: locales,
            social: newHowToSocial,
        };

        // Add the how-to to Firebase, relying on the realtime listener to update the local cache.
        try {
            // create the document
            await setDoc(
                doc(firestore, HowTosCollection, newHowTo.id),
                newHowTo,
            );

            // add the how-to to the how-to cache, but not remotely; we just created it
            let howTo = new HowTo(newHowTo);
            await this.updateHowTo(howTo, false);

            // add the how-to's ID to the gallery's list of how-to IDs
            this.db.Galleries.edit(gallery.withHowTo(newHowTo.id));
        } catch (error) {
            console.error(error);
            return undefined;
        }

        return this.getHowTo(newHowTo.id);
    }

    async getHowTo(howToId: string): Promise<HowTo | undefined | false> {
        // do we have the how-to cached? return it.
        const howTo = this.howtos.get(howToId);
        if (howTo) return howTo;

        // if not, see if it's in the database
        if (firestore === undefined) return undefined;
        try {
            const howToDoc = await getDoc(
                doc(firestore, HowTosCollection, howToId),
            );

            if (howToDoc.exists()) {
                const remoteHowTo = howToDoc.data();
                if (remoteHowTo === undefined) return undefined;

                const newHowTo = new HowTo(remoteHowTo as HowToDocument);
                // Update the doc locally but do not persist, we already know it's in the database
                this.updateHowTo(newHowTo, false);

                return newHowTo;
            } else return undefined;
        } catch (error) {
            return false;
        }
    }

    async getHowTos(howToIds: string[]): Promise<HowTo[]> {
        let howTos: HowTo[] = [];

        howToIds.forEach(async (howToId) => {
            const howTo = await this.getHowTo(howToId);
            if (howTo) {
                howTos.push(howTo);
            }
        });

        return Promise.resolve(howTos);
    }

    ignore() {
        if (this.unsubscribe) this.unsubscribe();
    }

    listen(firestore: Firestore, userId: string) {
        this.ignore();

        // get the current list of galleries to watch
        // galleries where the user is a creator or curator
        const editorGalleryIds = Array.from(
            this.db.Galleries.accessibleGalleries.keys(),
        );

        // construct constraints based on

        // for published how-tos
        // (1) any how-tos that the user has access to as a creator or collaborator on the how-to itself
        // (2) any how-tos that the user has access to as a curator or collaborator on the gallery
        // (3) any how-tos that the user has access to via expanded scope access
        let creatorOrCollaborator = [
            where('creator', '==', userId),
            where('collaborators', 'array-contains', userId),
        ];
        let editorGalleryConstraints = editorGalleryIds.map((galleryId) =>
            where('galleryId', '==', galleryId),
        );

        let draftQuery = and(
            where('published', '==', false),
            or(...creatorOrCollaborator),
            or(...editorGalleryConstraints),
        );
        let publishedQuery = and(
            where('published', '==', true),
            or(
                or(...creatorOrCollaborator),
                or(...editorGalleryConstraints),
                and(
                    where('scopeOverwrite', '==', false),
                    where('viewersFlat', 'array-contains', userId)
                ),
            ),
        );

        // start time for notifications
        const startTime: number = Date.now();

        // set up the realtime how-tos query for the user, tracking any how-tos from the cloud
        // and deleting any tracked locally that didn't appear in the snapshot
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, HowTosCollection),
                or(draftQuery, publishedQuery),
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
                        );
                    } catch (error) {
                        // If the how-to doesn't succeed, then we don't save it.
                        console.error(error);
                    }
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                // And see if any were explicitly added, and if so, create a notification
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the gallery.
                    if (change.type === 'removed') {
                        const howToId = change.doc.id;

                        this.howtos.delete(howToId);
                    } else if (change.type === 'added') {
                        const data = change.doc.data();

                        if (
                            data.published &&
                            data.publishedAt !== null &&
                            data.publishedAt >= startTime &&
                            data.social.notifySubscribers == true
                        ) {
                            notifications.set(data.id + 'howto', {
                                title: data.title,
                                galleryID: data.galleryId,
                                itemID: data.id,
                                type: 'howto',
                            } as NotificationData);
                        }
                    }
                });
            },
            (error) => {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            },
        );
    }

    addListener(howToId: string, listener: (howTo: HowTo) => void) {
        const current = this.listeners.get(howToId);

        if (current) current.add(listener);
        else this.listeners.set(howToId, new Set([listener]));
    }

    ignoreListener(howToId: string, listener: (howTo: HowTo) => void) {
        const current = this.listeners.get(howToId);

        if (current) current.delete(listener);
    }
}
