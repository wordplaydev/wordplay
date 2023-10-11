import type { SerializedProject } from '@models/Project';
import { writable, type Writable } from 'svelte/store';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    or,
    query,
    setDoc,
    where,
} from 'firebase/firestore';
import { firestore, auth } from '@db/firebase';
import {
    deleteUser,
    onAuthStateChanged,
    onIdTokenChanged,
    type Unsubscribe,
    type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import type Locale from '../locale/Locale';
import en from '../locale/en-US.json';
import {
    type SupportedLocale,
    getBestSupportedLocales,
} from '../locale/Locale';
import type Setting from './Setting';
import ProjectsDatabase from './ProjectsDatabase';
import LocalesDatabase from './LocalesDatabase';
import SettingsDatabase from './SettingsDatabase';
import { PersistenceType } from './ProjectHistory';
import GalleryDatabase from './GalleryDatabase';
import CreatorDatabase from './CreatorDatabase';

export enum SaveStatus {
    Saved = 'saved',
    Saving = 'saving',
    Error = 'error',
}

export class Database {
    /** The database of local persisted settings */
    readonly Settings: SettingsDatabase;

    /** The database of loaded locales and settings. Encapsuled to avoid cluttering this central interface to persistence and caches. */
    readonly Locales: LocalesDatabase;

    /** An IndexedDB backed database of projects, allowing for scalability of local persistence. */
    readonly Projects: ProjectsDatabase;

    /** A collection of Galleries loaded from the database */
    readonly Galleries: GalleryDatabase;

    /** A collection of creators loaded from the database */
    readonly Creators: CreatorDatabase;

    /** The status of persisting the projects. */
    readonly Status: Writable<SaveStatus> = writable(SaveStatus.Saved);

    /** The current Firestore user ID */
    private user: User | null = null;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private authRefreshUnsubscribe: Unsubscribe | undefined = undefined;
    private projectsQueryUnsubscribe: Unsubscribe | undefined = undefined;

    constructor(locales: SupportedLocale[], defaultLocale: Locale) {
        // Set up in-memory stores of configuration settings and locale caches.
        this.Settings = new SettingsDatabase(this, locales);
        this.Locales = new LocalesDatabase(
            this,
            locales,
            defaultLocale,
            this.Settings.settings.locales
        );
        this.Projects = new ProjectsDatabase(this);
        this.Galleries = new GalleryDatabase(this);
        this.Creators = new CreatorDatabase(this);
    }

    getUser() {
        return this.user;
    }

    getUserID() {
        return this.user ? this.user.uid : null;
    }

    getUserEmail() {
        return this.user ? this.user.email : null;
    }

    /** Update the saving status and broadcast via the store. */
    setStatus(status: SaveStatus) {
        this.Status.set(status);
    }

    getLocales(): Locale[] {
        return this.Locales.getLocales();
    }

    /** Saves settings to user's firestore record, if available. */
    uploadSettings() {
        this.setStatus(SaveStatus.Saving);
        try {
            // Try to save settings in the cloud.
            if (firestore && this.user) {
                // Save in firestore
                setDoc(
                    doc(firestore, 'users', this.user.uid),
                    this.Settings.toObject()
                );
            }

            this.setStatus(SaveStatus.Saved);
        } catch (_) {
            this.setStatus(SaveStatus.Error);
        }
    }

    /** Start listening to the Firebase Auth user changes */
    login(callback: (use: User | null) => void) {
        if (auth === undefined) return;
        // Keep the user store in sync.
        this.authUnsubscribe = onAuthStateChanged(auth, async (newUser) => {
            callback(newUser);
            // Update the Projects with the new user, syncing with the database.
            this.updateUser(newUser);

            // Update the galleries query with the new user.
            this.Galleries.listen();
        });
        this.authRefreshUnsubscribe = onIdTokenChanged(
            auth,
            async (newUser) => {
                callback(newUser);
            }
        );
    }

    /** Start a realtime database query on this user's projects, updating them whenever they change. */
    async updateUser(user: User | null) {
        if (firestore === undefined) return;

        // Update the user ID
        this.user = user;

        // Unsubscribe from the old user's realtime project query
        if (this.projectsQueryUnsubscribe) {
            this.projectsQueryUnsubscribe();
            this.projectsQueryUnsubscribe = undefined;
        }

        // Is there a user logged in now? Set up the realtime projects query,
        // save any local projects to the database and get configuration data from the cloud.
        if (this.user) {
            // Any time projects a creator has access to changes in the database, update projects.
            this.projectsQueryUnsubscribe = onSnapshot(
                query(
                    collection(firestore, 'projects'),
                    or(
                        where('owner', '==', this.user.uid),
                        where('collaborators', 'array-contains', this.user.uid)
                    )
                ),
                async (snapshot) => {
                    const serialized: SerializedProject[] = [];
                    snapshot.forEach((project) => {
                        serialized.push(project.data() as SerializedProject);
                    });

                    // Deserialize the projects and track them, if they're not already tracked
                    for (const project of await this.Projects.deserializeAll(
                        serialized
                    ))
                        this.Projects.track(
                            project,
                            true,
                            PersistenceType.Online,
                            true
                        );
                },
                (error) => {
                    if (error instanceof FirebaseError) {
                        console.error(error.code);
                        console.error(error.message);
                    }
                    this.setStatus(SaveStatus.Error);
                }
            );

            // If we have a user, save the current database to the cloud
            this.Projects.saveSoon();

            // Get the config from the database
            const config = await getDoc(doc(firestore, 'users', this.user.uid));
            if (config.exists()) {
                const data = config.data();
                // Copy each key/value pair from the database to memory and the local store.
                for (const key in data) {
                    if (key in this.Settings.settings) {
                        const value = data[key];
                        (
                            this.Settings.settings as Record<
                                string,
                                Setting<unknown>
                            >
                        )[key].set(this, value);
                    }
                }
            }
        }
    }

    /** Clean up listeners */
    clean() {
        if (this.projectsQueryUnsubscribe) this.projectsQueryUnsubscribe();
        if (this.authUnsubscribe) this.authUnsubscribe();
        if (this.authRefreshUnsubscribe) this.authRefreshUnsubscribe();

        this.Galleries.clean();
    }

    /** Delete account, including all projects, settings, and user. */
    async deleteAccount(): Promise<boolean> {
        // Not logged in? Do nothing.
        const user = this.getUser();
        if (user === null) return false;

        // No firestore? Do nothing.
        if (firestore === undefined) return false;

        try {
            await this.Projects.archiveAllProjects();
        } catch (err) {
            console.error(err);
            return false;
        }

        // Archiving was successful, delete the user's settings and then the user.
        try {
            await deleteDoc(doc(firestore, 'users', user.uid));
            await deleteUser(user);
        } catch (err) {
            console.error(err);
            return false;
        }

        return true;
    }

    /** Utility function for getting URL from server */
    async getHTML(url: string): Promise<Response | undefined> {
        // Ask the server to get the URL
        try {
            return await fetch(
                `${
                    import.meta.hot ? 'http://127.0.0.1:5002' : ''
                }/function/getWebpage?url=${encodeURI(url)}`
            );
        } catch (_) {
            return undefined;
        }
    }
}

export const DefaultLocale = en as Locale;

const BrowserLanguages =
    typeof navigator !== 'undefined' ? navigator.languages : [];

export const DB = new Database(
    getBestSupportedLocales(BrowserLanguages.slice()),
    DefaultLocale
);

export const Settings = DB.Settings;
export const Projects = DB.Projects;
export const Locales = DB.Locales;
export const Galleries = DB.Galleries;
export const Creators = DB.Creators;

export const animationFactor = Settings.settings.animationFactor.value;
export const animationDuration = Settings.animationDuration;
export const tutorialProgress = Settings.settings.tutorial.value;
export const arrangement = Settings.settings.arrangement.value;
export const locale = DB.Locales.locale;
export const locales = DB.Locales.locales;
export const languages = DB.Locales.languages;
export const writingDirection = DB.Locales.writingDirection;
export const writingLayout = Settings.settings.writingLayout.value;
export const camera = Settings.settings.camera.value;
export const dark = Settings.settings.dark.value;
export const mic = Settings.settings.mic.value;
export const blocks = Settings.settings.blocks.value;
export const status = DB.Status;
export const editableProjects = Projects.allEditableProjects;

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        DB.Locales.refreshLocales();
    });
}
