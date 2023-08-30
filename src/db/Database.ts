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
import { firestore, auth, functions } from '@db/firebase';
import {
    deleteUser,
    onAuthStateChanged,
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
import { httpsCallable } from 'firebase/functions';
import { PersistenceType } from './ProjectHistory';

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

    /** The status of persisting the projects. */
    readonly Status: Writable<SaveStatus> = writable(SaveStatus.Saved);

    /** The current Firestore user ID */
    private user: User | null = null;

    /** A cache of user email addresses retrieved from Firesbase */
    private emailsByUserID = new Map<string, string>();
    private userIDsByEmails = new Map<string, string>();

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
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

    /** Start listening tothe Firebase Auth user changes */
    login(callback: (use: User | null) => void) {
        if (auth === undefined) return;
        // Keep the user store in sync.
        this.authUnsubscribe = onAuthStateChanged(auth, async (newUser) => {
            callback(newUser);
            // Update the Projects with the new user, syncing with the database.
            this.updateUser(newUser);
        });
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

    async getEmailFromUserIDs(
        uids: string[]
    ): Promise<Map<string, string | null>> {
        // Create a new mapping.
        const emails = new Map<string, string | null>();

        // Populate it with any emails we already have.
        // Keep track of any uids we don't have.
        const unknown: string[] = [];
        for (const uid of uids) {
            const email = this.emailsByUserID.get(uid);
            if (email) emails.set(uid, email);
            else unknown.push(uid);
        }

        // If there are unknowns, ask the server for them.
        // No access to functions? Do nothing.
        if (unknown.length > 0 && functions) {
            const getUserEmails = httpsCallable<
                { uids: string[] },
                Record<string, string>
            >(functions, 'getEmailsFromUserIDs');

            const newEmails = await getUserEmails({
                uids: unknown,
            });
            for (const [uid, email] of Object.entries(newEmails.data)) {
                emails.set(uid, email);
            }
        }

        // Cache them
        for (const [uid, email] of emails) {
            if (email) {
                this.emailsByUserID.set(uid, email);
                this.userIDsByEmails.set(email, uid);
            }
        }

        return emails;
    }

    async getUserIDsFromEmails(
        emails: string[]
    ): Promise<Map<string, string | null>> {
        // Create a new mapping.
        const userIDs = new Map<string, string | null>();

        // Populate it with any emails we already have.
        // Keep track of any uids we don't have.
        const unknown: string[] = [];
        for (const email of emails) {
            const userID = this.userIDsByEmails.get(email);
            if (userID) userIDs.set(email, userID);
            else unknown.push(email);
        }

        // If there are unknowns, ask the server for them.
        // No access to functions? Do nothing.
        if (unknown.length > 0 && functions) {
            const getUserIDs = httpsCallable<
                { emails: string[] },
                Record<string, string>
            >(functions, 'getUserIDsFromEmails');

            const newUserIDs = await getUserIDs({
                emails: unknown,
            });
            for (const [email, uid] of Object.entries(newUserIDs.data)) {
                userIDs.set(email, uid);
            }
        }

        // Cache them
        for (const [email, uid] of userIDs) {
            if (uid) {
                this.emailsByUserID.set(uid, email);
                this.userIDsByEmails.set(email, uid);
            }
        }

        return userIDs;
    }

    async getUserIDFromEmail(email: string) {
        await this.getUserIDsFromEmails([email]);
        return this.userIDsByEmails.get(email);
    }

    /** Clean up listeners */
    clean() {
        if (this.projectsQueryUnsubscribe) this.projectsQueryUnsubscribe();
        if (this.authUnsubscribe) this.authUnsubscribe();
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
