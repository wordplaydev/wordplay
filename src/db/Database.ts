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
import { type FormattedText } from '../locale/LocaleText';
import { CharactersDatabase } from './characters/CharacterDatabase.svelte';
import { ChatDatabase } from './chats/ChatDatabase.svelte';
import CreatorDatabase, { CreatorCollection } from './creators/CreatorDatabase';
import GalleryDatabase from './galleries/GalleryDatabase.svelte';
import { HowToDatabase } from './howtos/HowToDatabase.svelte';
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

export const SaveStatus = {
    Saved: 'saved',
    Saving: 'saving',
    Error: 'error',
} as const;
export type SaveStatus = (typeof SaveStatus)[keyof typeof SaveStatus];

export class Database {
    /** The database of local persisted settings */
    readonly Settings: SettingsDatabase;

    /** The database of loaded locales and settings. Encapsuled to avoid cluttering this central interface to persistence and caches. */
    readonly Locales: LocalesDatabase;

    /** Lazily-instantiated sub-databases. Only constructed on first access so the
     * landing page (and other surfaces that don't need them) avoid the IndexedDB
     * hydration, Firestore listeners, and other startup work each one performs. */
    private _projects: ProjectsDatabase | undefined;
    private _galleries: GalleryDatabase | undefined;
    private _creators: CreatorDatabase | undefined;
    private _chats: ChatDatabase | undefined;
    private _characters: CharactersDatabase | undefined;
    private _howtos: HowToDatabase | undefined;

    /** An IndexedDB backed database of projects, allowing for scalability of local persistence. */
    get Projects(): ProjectsDatabase {
        if (this._projects === undefined) {
            this._projects = new ProjectsDatabase(this);
            // If a user is already known by the time this is first accessed,
            // catch up so the new instance reflects the current auth state.
            if (this.user !== null) this._projects.syncUser(false);
        }
        return this._projects;
    }

    /** A collection of Galleries loaded from the database */
    get Galleries(): GalleryDatabase {
        // GalleryDatabase's constructor calls registerRealtimeUpdates() itself,
        // so it already picks up the current user when constructed late.
        return (this._galleries ??= new GalleryDatabase(this));
    }

    /** A collection of creators loaded from the database */
    get Creators(): CreatorDatabase {
        return (this._creators ??= new CreatorDatabase(this));
    }

    /** A collection of chats loaded from the database */
    get Chats(): ChatDatabase {
        if (this._chats === undefined) {
            this._chats = new ChatDatabase(this);
            if (this.user !== null) this._chats.syncUser();
        }
        return this._chats;
    }

    /** A collection of characters loaded from the database */
    get Characters(): CharactersDatabase {
        if (this._characters === undefined) {
            this._characters = new CharactersDatabase(this);
            if (this.user !== null) this._characters.syncUser();
        }
        return this._characters;
    }

    /** A collection of how-tos loaded from the database */
    get HowTos(): HowToDatabase {
        if (this._howtos === undefined) {
            this._howtos = new HowToDatabase(this);
            if (this.user !== null) this._howtos.syncUser();
        }
        return this._howtos;
    }

    /** The status of persisting the projects. */
    readonly Status: Writable<{
        status: SaveStatus;
        message: undefined | ((locale: LocaleText) => FormattedText);
    }> = writable({ status: SaveStatus.Saved, message: undefined });

    /** The current Firestore user ID */
    private user: User | null = null;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private authRefreshUnsubscribe: Unsubscribe | undefined = undefined;

    constructor(locales: SupportedLocale[], defaultLocale: LocaleText) {
        // Set up in-memory stores of configuration settings and locale caches.
        // Settings and Locales remain eager since the root layout depends on
        // them for theming, fonts, and language direction on every page.
        this.Settings = new SettingsDatabase(this, locales);
        this.Locales = new LocalesDatabase(
            this,
            locales,
            defaultLocale,
            concretize,
            this.Settings.settings.locales,
        );
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
        message: undefined | ((locale: LocaleText) => FormattedText),
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

            // Update the galleries query with the new user, but only if the
            // gallery database has been instantiated. Lazily-constructed
            // galleries pick up the user via their own constructor.
            this._galleries?.registerRealtimeUpdates();
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

        // Notify only sub-databases that have been instantiated. Anything not
        // yet constructed will pick up the current user when its lazy getter
        // first runs, so we don't need to wake it up here.
        this._projects?.syncUser(remove);
        this._galleries?.clean();
        this.Settings.syncUser();
        this._chats?.syncUser();
        this._characters?.syncUser();
        this._howtos?.syncUser();
    }

    /** Clean up listeners */
    clean() {
        if (this.authUnsubscribe) this.authUnsubscribe();
        if (this.authRefreshUnsubscribe) this.authRefreshUnsubscribe();

        this._galleries?.clean();
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

/** Build a Proxy that defers resolution of a sub-database until first access.
 * This preserves the historical import shape (`import { Projects } from '@db/Database'`)
 * while still routing through the lazy getter on `Database`, so the underlying
 * sub-database is not constructed at module import time. */
function lazySubDB<T extends object>(resolve: () => T): T {
    return new Proxy({} as T, {
        get(_, prop) {
            const target = resolve();
            const value = Reflect.get(target, prop, target);
            return typeof value === 'function' ? value.bind(target) : value;
        },
        set(_, prop, value) {
            return Reflect.set(resolve(), prop, value, resolve());
        },
        has(_, prop) {
            return prop in resolve();
        },
        ownKeys() {
            return Reflect.ownKeys(resolve());
        },
        getOwnPropertyDescriptor(_, prop) {
            const target = resolve();
            const desc = Reflect.getOwnPropertyDescriptor(target, prop);
            // Proxies require descriptors of non-extensible targets to be
            // configurable, so mark them as such here.
            if (desc) desc.configurable = true;
            return desc;
        },
        getPrototypeOf() {
            return Reflect.getPrototypeOf(resolve());
        },
    });
}

// Settings and Locales are constructed eagerly by the Database constructor,
// so these references are safe to take at module load.
export const Settings = DB.Settings;
export const Locales = DB.Locales;

// The remaining sub-databases are wrapped in lazy proxies so that simply
// importing this module does not construct them. They are only realized
// when a caller actually reads a property or invokes a method.
export const Projects = lazySubDB(() => DB.Projects);
export const Galleries = lazySubDB(() => DB.Galleries);
export const Creators = lazySubDB(() => DB.Creators);
export const Chats = lazySubDB(() => DB.Chats);
export const CharactersDB = lazySubDB(() => DB.Characters);
export const HowTos = lazySubDB(() => DB.HowTos);

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
export const voice = Settings.settings.say.value;
export const blocks = Settings.settings.blocks.value;
export const howToNotifications = Settings.settings.howToNotifications.value;
export const status = DB.Status;

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        DB.Locales.refreshLocales();
    });
}
