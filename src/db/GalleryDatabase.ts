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
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import Gallery from '../models/Gallery';
import type { Database } from './Database';
import { firestore } from './firebase';
import type { SerializedGallery } from '../models/Gallery';
import { FirebaseError } from 'firebase/app';
import { get, writable, type Writable } from 'svelte/store';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import { toLocaleString } from '../locale/Locale';

export default class GalleryDatabase {
    /** The main database that manages this gallery database */
    readonly database: Database;

    /**
     * Galleries that have been loaded from the database, indexed by
     * ID. Undefined if loading, string key for error otherwise.
     * We keep them in a store so that consumers of the gallery can
     * react to to changes to the set, but also changes to individual galleries.
     **/
    readonly creatorGalleries: Writable<Map<string, Writable<Gallery>>> =
        writable(new Map());

    /** A reactive loading status, for the UI. */
    readonly status: Writable<'loading' | 'noaccess' | 'loggedout' | 'loaded'> =
        writable('loading');

    /** Public galleries that have been loaded individually. */
    readonly publicGalleries: Map<string, Writable<Gallery>> = new Map();

    /** The unsubscribe function for the real time query for galleries this user has access to. */
    private galleriesQueryUnsubscribe: Unsubscribe | undefined;

    constructor(database: Database) {
        this.database = database;

        this.listen();
    }

    /** Find all galleries that this user has access to */
    listen() {
        // No database access? Bail and mark an error.
        if (firestore === undefined) {
            this.status.set('noaccess');
            return;
        }

        // No user? Bail and mark an error.
        const user = this.database.getUser();
        if (user === null) {
            this.status.set('loggedout');
            return;
        }

        this.status.set('loading');

        this.galleriesQueryUnsubscribe = onSnapshot(
            // Listen for any changes to galleries for which this user is a curator or creator.
            query(
                collection(firestore, 'galleries'),
                or(
                    where('curators', 'array-contains', user.uid),
                    where('creators', 'array-contains', user.uid)
                )
            ),
            async (snapshot) => {
                // Get the existing galleries, or make a map if we don't have them.
                const existingGalleries = get(this.creatorGalleries);

                // Create a new index, implicitly removing galleries
                // that don't appear in this new query.
                const newGalleries: Map<string, Writable<Gallery>> = new Map();

                // Go through all of the galleries and update them.
                snapshot.forEach((galleryDoc) => {
                    // Get the gallery data from the Firestore document
                    const data = galleryDoc.data() as SerializedGallery;

                    // Wrap it in a gallery.
                    const gallery = new Gallery(data);

                    // Get the store for the gallery, or make one if we don't have one yet, and update the map.
                    // Also check the public galleries, in case we loaded it there first, so we reuse the same store.
                    let store =
                        existingGalleries.get(gallery.getID()) ??
                        this.publicGalleries.get(gallery.getID());
                    // Already have a store? Update it.
                    if (store) {
                        store.set(gallery);
                    }
                    // No store yet? Make one and set it in the map.
                    else {
                        store = writable(gallery);
                    }
                    newGalleries.set(gallery.getID(), store);
                });

                // Update creator galleries, since the whole set has changed.
                this.creatorGalleries.set(newGalleries);

                // Mark the database loaded.
                this.status.set('loaded');
            },
            (error) => {
                this.status.set('noaccess');
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            }
        );
        3;
    }

    /** Create a new gallery with this user as its curator. */
    async create(locale: Locale): Promise<string | undefined> {
        const user = this.database.getUser();
        if (user === null) return undefined;

        if (firestore === undefined) return undefined;

        const id = uuidv4();
        const name: Record<string, string> = {};
        name[toLocaleString(locale)] = locale.ui.gallery.untitled;
        const description: Record<string, string> = {};
        description[toLocaleString(locale)] = '';
        const gallery: SerializedGallery = {
            id,
            path: null,
            name,
            description,
            words: [],
            projects: [],
            curators: [user.uid],
            creators: [],
            public: false,
            featured: false,
        };

        // Save the gallery locally.
        this.edit(new Gallery(gallery));

        return id;
    }

    async getStore(id: string): Promise<Writable<Gallery> | undefined> {
        // See if we have it cached.
        const galleries = get(this.creatorGalleries);
        if (galleries instanceof Map) {
            const cache = galleries.get(id);
            if (cache) return cache;
        }

        // See if it's a public gallery.
        const publicGallery = this.publicGalleries.get(id);
        if (publicGallery) return publicGallery;

        // Didn't find it locally? See if we get read it from the database.
        if (firestore) {
            try {
                const galDoc = await getDoc(doc(firestore, 'galleries', id));
                if (galDoc.exists()) {
                    const gallery = new Gallery(
                        galDoc.data() as SerializedGallery
                    );
                    const store =
                        this.publicGalleries.get(id) ??
                        writable<Gallery>(gallery);
                    store.set(gallery);
                    this.publicGalleries.set(id, store);
                    return store;
                }
            } catch (_) {
                return undefined;
            }
        }

        // Didn't find it.
        return undefined;
    }

    /** Get a gallery with this ID */
    async get(id: string): Promise<Gallery | undefined> {
        const store = await this.getStore(id);
        return store ? get(store) : undefined;
    }

    /** Update the given gallery in the cloud. */
    async edit(gallery: Gallery) {
        if (firestore === undefined) return undefined;
        await setDoc(
            doc(firestore, 'galleries', gallery.getID()),
            gallery.data
        );

        // Update the gallery store for this gallery.
        const galleries = get(this.creatorGalleries);
        galleries.set(
            gallery.getID(),
            galleries.get(gallery.getID()) ?? writable(gallery)
        );
    }

    async delete(gallery: Gallery) {
        if (firestore === undefined) return undefined;
        await deleteDoc(doc(firestore, 'galleries', gallery.getID()));

        // The realtime query will remove it.
    }

    // Add the given project to the given gallery ID, or remove it if the gallery ID is undefined.
    async addProject(project: Project, galleryID: string) {
        if (galleryID === undefined) return;

        // Find the gallery.
        const gallery = await this.get(galleryID);

        // No matching gallery? Bail.
        if (gallery === undefined) return;

        // Revise the project with a gallery ID. If the gallery is public, the project becomes public.
        this.database.Projects.edit(
            project.withGallery(galleryID),
            false,
            true
        );

        // Remove the project from other galleries, since a project can only be in one gallery.
        const galleries = get(this.creatorGalleries);
        for (const store of galleries.values()) {
            const gallery = get(store);
            if (gallery.hasProject(project.id))
                this.edit(gallery.withoutProject(project.id));
        }

        // Add the project ID to the gallery.
        this.edit(gallery.withProject(project.id));
    }

    // Remove the project from the gallery that it's in.
    async removeProject(project: Project) {
        const galleryID = project.gallery;
        if (galleryID === null) return;

        // Find the gallery.
        const gallery = await this.get(galleryID);

        // No matching gallery? Bail.
        if (gallery === undefined) return;

        // Revise the project with a gallery ID.
        this.database.Projects.edit(project.withGallery(null), false, true);

        // Revise the gallery with a project ID.
        this.edit(gallery.withoutProject(project.id));
    }

    // Remove the given creator from the gallery, and all of their projects.
    async removeCreator(gallery: Gallery, uid: string) {
        const projectsToKeep = await this.removeCreatorPojrects(gallery, uid);
        this.edit(gallery.withProjects(projectsToKeep).withoutCreator(uid));
    }

    // Remove the given creator from the gallery, and all of their projects.
    async removeCurator(gallery: Gallery, uid: string) {
        const projectsToKeep = await this.removeCreatorPojrects(gallery, uid);
        this.edit(gallery.withProjects(projectsToKeep).withoutCurator(uid));
    }

    async removeCreatorPojrects(
        gallery: Gallery,
        uid: string
    ): Promise<string[]> {
        // Find all of the projects for which the given creator is an owner
        // so we can remove them from the given gallery.
        const projectsToKeep: string[] = [];
        for (const projectID of gallery.getProjects()) {
            const project = await this.database.Projects.get(projectID);
            if (project === undefined || project.owner !== uid)
                projectsToKeep.push(projectID);
            else {
                this.database.Projects.edit(
                    project.withGallery(null),
                    false,
                    true
                );
            }
        }
        return projectsToKeep;
    }

    clean() {
        // Stop listening if we're unmounting.
        if (this.galleriesQueryUnsubscribe) this.galleriesQueryUnsubscribe();
    }
}
