import type { ProjectID } from '@db/projects/ProjectSchemas';
import { FirebaseError } from 'firebase/app';
import {
    and,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    or,
    query,
    setDoc,
    where,
    writeBatch,
    type Unsubscribe,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import { getExampleGalleries } from '../../examples/examples';
import { localeToString } from '@locale/Locale';
import type Locales from '@locale/Locales';
import { type Database } from '@db/Database';
import { firestore } from '@db/firebase';
import type Project from '@db/projects/Project';
import { ProjectsCollection } from '@db/projects/ProjectsDatabase.svelte';
import {
    ClassesCollection,
    ClassSchema,
    getClass,
    setClass,
} from '@db/teachers/TeacherDatabase.svelte';
import Gallery, {
    deserializeGallery,
    GallerySchemaLatestVersion,
    type SerializedGallery,
} from '@db/galleries/Gallery';

/** The name of the galleries collection in Firebase */
export const GalleriesCollection = 'galleries';

/** The in-memory representation of a Gallery, for type safe manipulation and analysis. */
export default class GalleryDatabase {
    /** The main database that manages this gallery database */
    readonly database: Database;

    /**
     * A reactive map of the galleries that have been loaded from the database because this creator is a creator or curator of the gallery.
     **/
    readonly accessibleGalleries: SvelteMap<string, Gallery> = new SvelteMap();

    /**
     * A reactive map of the galleries where the user has access to its how-tos via "expanded scope"
     * (i.e., they are a creator or curator of a gallery A, which gives them access to gallery B
     * iff the curator of gallery A is the curator of gallery B and set the visibility of how-tos
     * to "expanded" for gallery B.)
     */
    readonly expandedScopeGalleries: SvelteMap<string, Gallery> =
        new SvelteMap();

    /** A reactive loading status, for the UI. */
    private status = $state<'loading' | 'noaccess' | 'loggedout' | 'loaded'>(
        'loading',
    );

    /** Example hard coded galleries */
    private exampleGalleries: Gallery[] = $state([]);

    /** Public galleries that have been loaded individually, by gallery ID. */
    readonly publicGalleries: SvelteMap<string, Gallery> = new SvelteMap();

    /** The unsubscribe function for the real time query for galleries this user has access to. */
    private galleriesQueryUnsubscribe: Unsubscribe | undefined;

    /** A list of projects on which listeners for gallery updates to keep data in sync. */
    private listeners: Map<ProjectID, Set<(gallery: Gallery) => void>> =
        new Map();

    constructor(database: Database) {
        this.database = database;

        // Add the example galleries to the database.
        const examples = getExampleGalleries(database.Locales.getLocaleSet());
        for (const gallery of examples) {
            this.publicGalleries.set(gallery.getID(), gallery);
            this.exampleGalleries.push(gallery);
        }

        // When the list of locales change, recreate the galleries with the new locales.
        database.Locales.locales.subscribe((locales) => {
            // Update each gallery store with the new localized gallery.
            const localizedExamples = getExampleGalleries(locales);
            for (const gallery of localizedExamples) {
                this.publicGalleries.set(gallery.getID(), gallery);
            }
            // Update the list of example galleries.
            this.exampleGalleries = localizedExamples;
        });

        this.registerRealtimeUpdates();
    }

    getExampleGalleries() {
        return this.exampleGalleries;
    }

    /** Find all galleries that this user has access to */
    registerRealtimeUpdates() {
        // No database access? Bail and mark an error.
        if (firestore === undefined) {
            this.status = 'noaccess';
            return;
        }

        // No user? Bail and mark an error.
        const user = this.database.getUser();
        if (user === null) {
            this.status = 'loggedout';
            return;
        }

        this.status = 'loading';

        this.galleriesQueryUnsubscribe = onSnapshot(
            // Listen for any changes to galleries for which this user is a curator or creator.
            // also listen to any changes to galleries where the user is a viewer of its how-tos
            query(
                collection(firestore, GalleriesCollection),
                or(
                    where('curators', 'array-contains', user.uid),
                    where('creators', 'array-contains', user.uid),
                    and(
                        where('howToExpandedVisibility', '==', true),
                        where('howToViewersFlat', 'array-contains', user.uid),
                    ),
                ),
            ),
            async (snapshot) => {
                // Go through all of the galleries and update them.
                snapshot.forEach((galleryDoc) => {
                    // Wrap it in a gallery.
                    const gallery = deserializeGallery(galleryDoc.data());

                    if (
                        gallery.getCreators().includes(user.uid) ||
                        gallery.getCurators().includes(user.uid)
                    ) {
                        // Get the store for the gallery, or make one if we don't have one yet, and update the map.
                        // Also check the public galleries, in case we loaded it there first, so we reuse the same store.
                        this.accessibleGalleries.set(gallery.getID(), gallery);

                        // Notify the project's database that gallery permissions changed, requring a reload of the any projects in the gallery to see new permissions.
                        this.database.Projects.refreshGallery(gallery);
                    } else {
                        // user is only a how-to viewer, which means they have expanded scope access only
                        this.expandedScopeGalleries.set(
                            gallery.getID(),
                            gallery,
                        );
                    }
                });

                // Remove the galleries that were removed from this query.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    // gallery is either in accessibleGalleries or expandedScopeGalleries
                    if (change.type === 'removed') {
                        this.accessibleGalleries.delete(change.doc.id);
                        this.expandedScopeGalleries.delete(change.doc.id);
                    }
                });

                // Make a new realtime query based on the access.
                this.database.Projects.syncUser(false);

                // Mark the database loaded.
                this.status = 'loaded';
            },
            (error) => {
                this.status = 'noaccess';
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            },
        );
    }

    getStatus() {
        return this.status;
    }

    /** Call the given function when the project with the given ID is involved in a gallery edit. */
    listen(projectID: string, listener: (gallery: Gallery) => void) {
        const current = this.listeners.get(projectID);
        if (current) current.add(listener);
        else this.listeners.set(projectID, new Set([listener]));
    }

    /** Stop calling the given function when the project with the given ID is involved in a gallery edit. */
    ignore(projectID: string, listener: (gallery: Gallery) => void) {
        const current = this.listeners.get(projectID);
        if (current) current.delete(listener);
    }

    /** Create a new gallery, with the given curators and creators, defaulting to the current user as curator and an empty list of creators.*/
    async create(
        locales: Locales,
        curators?: string[],
        creators?: string[],
        classid?: string,
    ): Promise<string | undefined> {
        const user = this.database.getUser();
        if (user === null) return undefined;

        if (firestore === undefined) return undefined;

        const id = uuidv4();
        const name: Record<string, string> = {};
        name[localeToString(locales.getLocales()[0])] =
            locales.getUnannotatedText((l) => l.ui.gallery.untitled);
        const description: Record<string, string> = {};
        description[localeToString(locales.getLocales()[0])] = '';

        const gallery: SerializedGallery = {
            v: GallerySchemaLatestVersion,
            id,
            path: null,
            name,
            description,
            words: [],
            projects: [],
            curators: curators ?? [user.uid],
            creators: creators ?? [],
            public: false,
            featured: false,
            howTos: [],
            howToExpandedVisibility: false,
            howToExpandedGalleries: [],
            howToViewers: {},
            howToViewersFlat: [],
            howToGuidingQuestions: locales.getUnannotatedTexts(
                (l) => l.ui.howto.configuration.guidingQuestions.default,
            ),
            howToReactions: locales.getTextStructure(
                (l) => l.ui.howto.configuration.reactions.default,
            ),
        };

        // Save the gallery online, and then locally. Return when it's created.
        await this.edit(new Gallery(gallery));

        // Update the class to reference the newly created gallery.
        if (classid) {
            const group = await getClass(classid);
            if (group) {
                await setClass({
                    ...group,
                    galleries: [...group.galleries, id],
                });
            } else console.error("Couldn't find class to update.");
        }

        return id;
    }

    /** Get a gallery with this ID */
    async get(id: string): Promise<Gallery | undefined> {
        // See if we have it cached.
        const cache = this.accessibleGalleries.get(id);
        if (cache) return cache;
        const expandedCache = this.expandedScopeGalleries.get(id);
        if (expandedCache) return expandedCache;

        // See if it's a public gallery.
        const publicGallery = this.publicGalleries.get(id);
        if (publicGallery) return publicGallery;

        // Didn't find it locally? See if we get read it from the database.
        if (firestore) {
            try {
                const galDoc = await getDoc(
                    doc(firestore, GalleriesCollection, id),
                );
                if (galDoc.exists()) {
                    const gallery = deserializeGallery(galDoc.data());
                    this.publicGalleries.set(id, gallery);
                    return gallery;
                }
            } catch (err) {
                console.error(`Couldn't get gallery with ID ${id}:`, err);
                return undefined;
            }
        }

        // Didn't find it.
        return undefined;
    }

    /** Update the given gallery in the cloud. */
    async edit(gallery: Gallery) {
        if (firestore === undefined) return undefined;
        await setDoc(
            doc(firestore, GalleriesCollection, gallery.getID()),
            gallery.data,
        );

        // Update the gallery store for this gallery.
        if (this.accessibleGalleries.has(gallery.getID())) {
            this.accessibleGalleries.set(gallery.getID(), gallery);
        } else if (this.expandedScopeGalleries.has(gallery.getID())) {
            this.expandedScopeGalleries.set(gallery.getID(), gallery);
        }

        // Notify all project listeners about the gallery updated.
        for (const project of gallery.getProjects()) {
            const listeners = this.listeners.get(project);
            if (listeners) listeners.forEach((listener) => listener(gallery));
        }
    }

    async delete(gallery: Gallery) {
        if (firestore === undefined) return undefined;
        const user = this.database.getUser();
        if (user === null) return undefined;

        // Remove all projects from the gallery.
        for (const projectID of gallery.getProjects()) {
            const project = await this.database.Projects.get(projectID);
            if (project) await this.removeProjectFromGallery(project);
        }

        // Delete all how-tos in the gallery
        gallery.getHowTos().forEach(async (howToID) => {
            await this.database.HowTos.deleteHowTo(howToID, gallery);
        });

        // Remove the gallery from any classes it is in.
        const classes = await getDocs(
            query(
                collection(firestore, ClassesCollection),
                where('galleries', 'array-contains', gallery.getID()),
            ),
        );
        // Don't wait for each removal, just async request it.
        classes.forEach((doc) => {
            const group = ClassSchema.parse(doc.data());
            setClass({
                ...group,
                galleries: group.galleries.filter((g) => g !== gallery.getID()),
            });
        });

        // Delete the gallery document now that the projects are removed.
        await deleteDoc(doc(firestore, GalleriesCollection, gallery.getID()));
    }

    // Add the given project to the given gallery ID, or remove it if the gallery ID is undefined.
    async addProject(project: Project, galleryID: string) {
        if (firestore === undefined || galleryID === undefined) return;

        // Find the gallery.
        const gallery = await this.get(galleryID);
        if (gallery === undefined) return;

        const projectID = project.getID();
        const oldGalleryID = project.getGallery();

        // Update the in-memory project to reflect the new gallery. Pass persist=false
        // so we can include the project doc write in our atomic batch below rather than
        // letting the project history's separate persist() race with it.
        const editResult = await this.database.Projects.edit(
            project.withGallery(galleryID),
            false,
            false,
            false,
            'immediate',
        );
        if (editResult !== undefined) return;

        // Get the just-edited project so we can serialize its latest form into the batch.
        const updated =
            this.database.Projects.getHistory(projectID)?.getCurrent();
        if (updated === undefined) return;

        // If a concurrent share/unshare ran between our history edit and now,
        // history.current will reflect that newer intent. Bail so the latest call
        // wins. This collapses the double-fire from the Options widget (its
        // onpointerdown + onchange both call this) and absorbs click-and-correct
        // sequences within a single event-loop turn.
        if (updated.getGallery() !== galleryID) return;

        // Single atomic batch: write the project doc and mutate both gallery projects
        // arrays. arrayUnion/arrayRemove are atomic at the field level on the server,
        // so concurrent shares to the same gallery accumulate rather than clobber.
        const batch = writeBatch(firestore);
        batch.set(
            doc(firestore, ProjectsCollection, projectID),
            updated.asPersisted().serialize(),
        );
        batch.update(doc(firestore, GalleriesCollection, galleryID), {
            projects: arrayUnion(projectID),
        });
        if (oldGalleryID !== null && oldGalleryID !== galleryID) {
            batch.update(doc(firestore, GalleriesCollection, oldGalleryID), {
                projects: arrayRemove(projectID),
            });
        }
        await batch.commit();

        // Mark the project history saved since we just persisted it.
        this.database.Projects.getHistory(projectID)?.markSaved();

        // Mirror the gallery changes in the local cache so the UI updates immediately
        // without waiting for the realtime listener to fire.
        this.applyLocalProjectMembership(projectID, galleryID, oldGalleryID);
    }

    // Remove the project from the gallery that it's in.
    async removeProject(project: Project, galleryID: string | null) {
        if (firestore === undefined) return;

        const projectID = project.getID();
        const targetGalleryID = galleryID ?? project.getGallery();

        // Update the in-memory project to clear its gallery field (no persist; batched below).
        const editResult = await this.database.Projects.edit(
            project.withGallery(null),
            false,
            false,
            false,
            'immediate',
        );
        if (editResult !== undefined) return;

        const updated =
            this.database.Projects.getHistory(projectID)?.getCurrent();
        if (updated === undefined) return;

        // Same race-collapsing check as addProject: if a concurrent share ran after
        // our history edit, history.current will hold a non-null gallery and we
        // should yield to that newer call rather than overwriting it.
        if (updated.getGallery() !== null) return;

        // Atomic batch: clear project.gallery and remove from the gallery's projects array.
        const batch = writeBatch(firestore);
        batch.set(
            doc(firestore, ProjectsCollection, projectID),
            updated.asPersisted().serialize(),
        );
        if (targetGalleryID !== null) {
            batch.update(
                doc(firestore, GalleriesCollection, targetGalleryID),
                { projects: arrayRemove(projectID) },
            );
        }
        await batch.commit();

        this.database.Projects.getHistory(projectID)?.markSaved();

        if (targetGalleryID !== null) {
            this.applyLocalProjectMembership(projectID, null, targetGalleryID);
        }
    }

    // Remove the project from whatever gallery it is in, but only the project side
    // (used by gallery deletion, where the gallery doc itself is about to be deleted).
    async removeProjectFromGallery(project: Project) {
        await this.database.Projects.edit(
            project.withGallery(null),
            false,
            true,
            false,
            'immediate',
        );
    }

    /**
     * Reflect a project's gallery-membership change in the local accessibleGalleries
     * cache and notify any project listeners. Avoids waiting on the realtime listener
     * to round-trip from the server.
     */
    private applyLocalProjectMembership(
        projectID: string,
        addedTo: string | null,
        removedFrom: string | null,
    ) {
        if (addedTo !== null) {
            const cached = this.accessibleGalleries.get(addedTo);
            if (cached) {
                const updated = cached.withProject(projectID);
                this.accessibleGalleries.set(addedTo, updated);
                this.listeners
                    .get(projectID)
                    ?.forEach((listener) => listener(updated));
            }
        }
        if (removedFrom !== null && removedFrom !== addedTo) {
            const cached = this.accessibleGalleries.get(removedFrom);
            if (cached) {
                const updated = cached.withoutProject(projectID);
                this.accessibleGalleries.set(removedFrom, updated);
                this.listeners
                    .get(projectID)
                    ?.forEach((listener) => listener(updated));
            }
        }
    }

    // Remove the given creator from the gallery, and all of their projects.
    async removeCreator(gallery: Gallery, uid: string) {
        await this.removeCreatorOrCurator(gallery, uid, 'creators');
    }

    // Remove the given curator from the gallery, and all of their projects.
    async removeCurator(gallery: Gallery, uid: string) {
        await this.removeCreatorOrCurator(gallery, uid, 'curators');
    }

    /**
     * Shared implementation for removing a creator or curator from a gallery.
     * Atomically:
     *   - clears `gallery` on every project in the gallery owned by uid,
     *   - removes those project IDs from the gallery's `projects` array,
     *   - removes uid from the gallery's `creators` or `curators` array.
     *
     * Uses arrayRemove on both the projects array and the role array, so
     * concurrent additions to either by other writers (e.g., another student
     * sharing a new project while this removal runs) aren't clobbered.
     */
    private async removeCreatorOrCurator(
        gallery: Gallery,
        uid: string,
        role: 'creators' | 'curators',
    ) {
        if (firestore === undefined) return;

        // Identify the projects in the gallery whose owner is uid; those will
        // have their `gallery` field cleared. Projects owned by anyone else
        // stay where they are.
        const projectsToRemove: string[] = [];
        for (const projectID of gallery.getProjects()) {
            try {
                const project = await this.database.Projects.get(projectID);
                if (project !== undefined && project.getOwner() === uid)
                    projectsToRemove.push(projectID);
            } catch (err) {
                console.error(err);
            }
        }

        const batch = writeBatch(firestore);
        for (const projectID of projectsToRemove) {
            batch.update(doc(firestore, ProjectsCollection, projectID), {
                gallery: null,
            });
        }
        const galleryUpdate: Record<string, unknown> = {
            [role]: arrayRemove(uid),
        };
        if (projectsToRemove.length > 0) {
            galleryUpdate.projects = arrayRemove(...projectsToRemove);
        }
        batch.update(
            doc(firestore, GalleriesCollection, gallery.getID()),
            galleryUpdate,
        );
        await batch.commit();

        // Mirror the gallery change in the local cache so the UI updates
        // immediately. Project history caches will refresh via the realtime
        // listener.
        const cached = this.accessibleGalleries.get(gallery.getID());
        if (cached) {
            let updated =
                role === 'creators'
                    ? cached.withoutCreator(uid)
                    : cached.withoutCurator(uid);
            for (const projectID of projectsToRemove)
                updated = updated.withoutProject(projectID);
            this.accessibleGalleries.set(gallery.getID(), updated);
        }
    }

    clean() {
        // Stop listening if we're unmounting.
        if (this.galleriesQueryUnsubscribe) this.galleriesQueryUnsubscribe();
    }
}
