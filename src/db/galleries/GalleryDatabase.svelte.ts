import {
    collection,
    onSnapshot,
    query,
    where,
    type Unsubscribe,
    or,
    setDoc,
    doc,
    getDoc,
    deleteDoc,
    getDocs,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import Gallery, { deserializeGallery, type SerializedGallery } from './Gallery';
import type { Database } from '../Database';
import { firestore } from '../firebase';
import { FirebaseError } from 'firebase/app';
import type Project from '../projects/Project';
import { localeToString } from '../../locale/Locale';
import { getExampleGalleries } from '../../examples/examples';
import type Locales from '../../locale/Locales';
import type { ProjectID } from '@db/projects/ProjectSchemas';
import { SvelteMap } from 'svelte/reactivity';
import {
    ClassesCollection,
    ClassSchema,
    getClass,
    setClass,
} from '../TeacherDatabase.svelte';

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
            query(
                collection(firestore, GalleriesCollection),
                or(
                    where('curators', 'array-contains', user.uid),
                    where('creators', 'array-contains', user.uid),
                ),
            ),
            async (snapshot) => {
                // Go through all of the galleries and update them.
                snapshot.forEach((galleryDoc) => {
                    // Wrap it in a gallery.
                    const gallery = deserializeGallery(galleryDoc.data());

                    // Get the store for the gallery, or make one if we don't have one yet, and update the map.
                    // Also check the public galleries, in case we loaded it there first, so we reuse the same store.
                    this.accessibleGalleries.set(gallery.getID(), gallery);

                    // Notify the project's database that gallery permissions changed, requring a reload of the any projects in the gallery to see new permissions.
                    this.database.Projects.refreshGallery(gallery);
                });

                // Remove the galleries that were removed from this query.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    if (change.type === 'removed')
                        this.accessibleGalleries.delete(change.doc.id);
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
        name[localeToString(locales.getLocales()[0])] = locales.get(
            (l) => l.ui.gallery.untitled,
        );
        const description: Record<string, string> = {};
        description[localeToString(locales.getLocales()[0])] = '';
        const gallery: SerializedGallery = {
            v: 1,
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
                console.error(err);
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
        this.accessibleGalleries.set(gallery.getID(), gallery);

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
        if (galleryID === undefined) return;

        // Find the gallery.
        const gallery = await this.get(galleryID);

        // No matching gallery? Bail.
        if (gallery === undefined) return;

        // Revise the project with a gallery ID. If the gallery is public, the project becomes public.
        const result = await this.database.Projects.edit(
            project.withGallery(galleryID),
            false,
            true,
            false,
            'immediate',
        );

        // Failure to edit project? Bail.
        if (result !== undefined) return;

        // Remove the project from other galleries, since a project can only be in one gallery.
        for (const gallery of this.accessibleGalleries.values()) {
            if (gallery.hasProject(project.getID()))
                this.edit(gallery.withoutProject(project.getID()));
        }

        // Add the project ID to the gallery.
        await this.edit(gallery.withProject(project.getID()));
    }

    // Remove the project from the gallery that it's in.
    async removeProject(project: Project, galleryID: string | null) {
        // Revise the project with a gallery ID.
        await this.removeProjectFromGallery(project);

        // Find the gallery from the given or the project, if provided.
        galleryID = galleryID ?? project.getGallery();

        // No gallery? No edit.
        if (galleryID === null) return;

        // Find the gallery.
        const gallery = await this.get(galleryID);

        // No matching gallery? Bail.
        if (gallery === undefined) return;

        // Revise the gallery with a project ID.
        await this.edit(gallery.withoutProject(project.getID()));
    }

    async removeProjectFromGallery(project: Project) {
        // Revise the project with a gallery ID.
        this.database.Projects.edit(
            project.withGallery(null),
            false,
            true,
            false,
            'immediate',
        );
    }

    // Remove the given creator from the gallery, and all of their projects.
    async removeCreator(gallery: Gallery, uid: string) {
        const projectsToKeep = await this.removeCreatorProjects(gallery, uid);
        await this.edit(
            gallery.withProjects(projectsToKeep).withoutCreator(uid),
        );
    }

    // Remove the given creator from the gallery, and all of their projects.
    async removeCurator(gallery: Gallery, uid: string) {
        const projectsToKeep = await this.removeCreatorProjects(gallery, uid);
        await this.edit(
            gallery.withProjects(projectsToKeep).withoutCurator(uid),
        );
    }

    async removeCreatorProjects(
        gallery: Gallery,
        uid: string,
    ): Promise<string[]> {
        // Find all of the projects for which the given creator is an owner
        // so we can remove them from the given gallery.
        const projectsToKeep: string[] = [];
        for (const projectID of gallery.getProjects()) {
            try {
                const project = await this.database.Projects.get(projectID);
                if (project === undefined || project.getOwner() !== uid)
                    projectsToKeep.push(projectID);
                else {
                    this.database.Projects.edit(
                        project.withGallery(null),
                        false,
                        true,
                    );
                }
            } catch (err) {
                console.error(err);
            }
        }
        return projectsToKeep;
    }

    clean() {
        // Stop listening if we're unmounting.
        if (this.galleriesQueryUnsubscribe) this.galleriesQueryUnsubscribe();
    }
}
