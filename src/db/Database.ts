import { auth, firestore } from '@db/firebase';
import concretize from '@locale/concretize';
import { getBestSupportedLocales } from '@locale/getBestSupportedLocales';
import { type SupportedLocale } from '@locale/SupportedLocales';
import {
    deleteUser,
    onAuthStateChanged,
    onIdTokenChanged,
    type Unsubscribe,
    type User,
} from 'firebase/auth';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { writable, type Writable } from 'svelte/store';
import DefaultLocale from '../locale/DefaultLocale';
import type LocaleText from '../locale/LocaleText';
import { type Template } from '../locale/LocaleText';
import { CharactersDatabase } from './characters/CharacterDatabase.svelte';
import { ChatDatabase } from './chats/ChatDatabase.svelte';
import CreatorDatabase, { CreatorCollection } from './creators/CreatorDatabase';
import GalleryDatabase from './galleries/GalleryDatabase.svelte';
import LocalesDatabase from './locales/LocalesDatabase';
import ProjectsDatabase from './projects/ProjectsDatabase.svelte';
import SettingsDatabase from './settings/SettingsDatabase';

// Intercept console.log and console.error

export const Logs: string[] = [];

{
    const log = console.log.bind(console);
    console.log = (...args) => {
        for (const arg of args) Logs.push(JSON.stringify(arg));
        log(...args);
    };
}

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

    /** A collection of chats loaded from the database */
    readonly Chats: ChatDatabase;

    /** A collection of characters loaded from the database */
    readonly Characters: CharactersDatabase;

    /** The status of persisting the projects. */
    readonly Status: Writable<{
        status: SaveStatus;
        message: undefined | ((locale: LocaleText) => Template);
    }> = writable({ status: SaveStatus.Saved, message: undefined });

    /** The current Firestore user ID */
    private user: User | null = null;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private authRefreshUnsubscribe: Unsubscribe | undefined = undefined;

    constructor(locales: SupportedLocale[], defaultLocale: LocaleText) {
        // Set up in-memory stores of configuration settings and locale caches.
        this.Settings = new SettingsDatabase(this, locales);
        this.Locales = new LocalesDatabase(
            this,
            locales,
            defaultLocale,
            concretize,
            this.Settings.settings.locales,
        );
        this.Projects = new ProjectsDatabase(this);
        this.Galleries = new GalleryDatabase(this);
        this.Creators = new CreatorDatabase(this);
        this.Chats = new ChatDatabase(this);
        this.Characters = new CharactersDatabase(this);
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
    setStatus(
        status: SaveStatus,
        message: undefined | ((locale: LocaleText) => Template),
    ) {
        this.Status.set({ status, message });
    }

    getLocales(): LocaleText[] {
        return this.Locales.getLocales();
    }

    /** Saves settings to user's firestore record, if available. */
    uploadSettings() {
        this.setStatus(SaveStatus.Saving, undefined);
        try {
            // Try to save settings in the cloud.
            if (firestore && this.user) {
                // Save in firestore
                setDoc(
                    doc(firestore, CreatorCollection, this.user.uid),
                    this.Settings.toObject(),
                );
            }

            this.setStatus(SaveStatus.Saved, undefined);
        } catch (_) {
            this.setStatus(
                SaveStatus.Error,
                (l) => l.ui.project.save.settingsUnsaved,
            );
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
            this.Galleries.registerRealtimeUpdates();
        });
        this.authRefreshUnsubscribe = onIdTokenChanged(
            auth,
            async (newUser) => {
                callback(newUser);
            },
        );
    }

    /** Start a realtime database query on this user's projects, updating them whenever they change. */
    async updateUser(user: User | null) {
        if (firestore === undefined) return;

        // Delete if the user changed if a different account was logged in, or logged out.
        const remove =
            this.user !== null && (user === null || user.uid !== this.user.uid);

        // Update the user ID
        this.user = user;

        // Tell the projects cache.
        this.Projects.syncUser(remove);

        // Tell the gallery about the new user
        this.Galleries.clean();

        // Tell the settings cache.
        this.Settings.syncUser();

        // Tell the chat cache.
        this.Chats.syncUser();

        // Tell the characters database.
        this.Characters.syncUser();
    }

    /** Clean up listeners */
    clean() {
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
            await this.Projects.deleteOwnedProjects();
        } catch (err) {
            console.error(err);
            return false;
        }

        // Archiving was successful, delete the user's settings and then the user.
        try {
            await deleteDoc(doc(firestore, CreatorCollection, user.uid));
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
                }/function/getWebpage?url=${encodeURI(url)}`,
            );
        } catch (_) {
            return undefined;
        }
    }
}

const BrowserLanguages =
    typeof navigator !== 'undefined' ? navigator.languages : [];

export const DB = new Database(
    getBestSupportedLocales(BrowserLanguages.slice()),
    DefaultLocale,
);

export const Settings = DB.Settings;
export const Projects = DB.Projects;
export const Locales = DB.Locales;
export const Galleries = DB.Galleries;
export const Creators = DB.Creators;
export const Chats = DB.Chats;
export const CharactersDB = DB.Characters;

export const animationFactor = Settings.settings.animationFactor.value;
export const animationDuration = Settings.animationDuration;
export const tutorialProgress = Settings.settings.tutorial.value;
export const arrangement = Settings.settings.arrangement.value;
export const locales = DB.Locales.locales;
export const writingLayout = Settings.settings.writingLayout.value;
export const camera = Settings.settings.camera.value;
export const dark = Settings.settings.dark.value;
export const spaceIndicator = Settings.settings.space.value;
export const showLines = Settings.settings.lines.value;
export const showAnnotations = Settings.settings.annotations.value;
export const mic = Settings.settings.mic.value;
export const blocks = Settings.settings.blocks.value;
export const status = DB.Status;

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        DB.Locales.refreshLocales();
    });
}
