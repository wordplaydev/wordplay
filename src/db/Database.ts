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
import {
    deleteDoc,
    doc,
    getDocFromServer,
    setDoc,
} from 'firebase/firestore';
import {
    derived,
    writable,
    type Readable,
    type Writable,
} from 'svelte/store';
import { prefersReducedMotion } from '@db/settings/prefersReducedMotion';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { type FormattedText } from '@locale/LocaleText';
import { CharactersDatabase } from '@db/characters/CharacterDatabase.svelte';
import { ChatDatabase } from '@db/chats/ChatDatabase.svelte';
import CreatorDatabase, { CreatorCollection } from '@db/creators/CreatorDatabase';
import GalleryDatabase from '@db/galleries/GalleryDatabase.svelte';
import { HowToDatabase } from '@db/howtos/HowToDatabase.svelte';
import LocalesDatabase from '@db/locales/LocalesDatabase';
import ProjectsDatabase from '@db/projects/ProjectsDatabase.svelte';
import SettingsDatabase from '@db/settings/SettingsDatabase';

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

    /** A collection of how-tos loaded from the database */
    readonly HowTos: HowToDatabase;

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

    /** Set true while a `waitForPendingWrites` check is racing a timeout.
     *  Concurrent writes share a single check rather than spawning their own. */
    private writeCheckInFlight = false;
    private static WRITE_CHECK_TIMEOUT_MS = 8_000;

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
        this.HowTos = new HowToDatabase(this);
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

    /** Update the saving status and broadcast via the store. Save status is
     *  intentionally NOT coupled to Firebase reachability: `uploadSettings`
     *  fires Saved even when no Firestore write happened (no logged-in user),
     *  which would otherwise falsely open the connection-banner gate. The
     *  connection state is driven instead by signals that correspond to real
     *  Firebase activity — passive snapshot `fromCache` detection, callable
     *  try/catch, and explicit `onSnapshot` error handlers. */
    setStatus(
        status: SaveStatus,
        message: undefined | ((locale: LocaleText) => FormattedText),
    ) {
        this.Status.set({ status, message });
    }

    markFirebaseDisconnected() {
        firebaseReachable.set(false);
    }

    markFirebaseReachable() {
        firebaseReachable.set(true);
        firebaseEverConnected.set(true);
    }

    /** Wrap a Firebase write to detect network failures. Use this around every
     *  `setDoc`, `updateDoc`, `deleteDoc`, `addDoc`, and `batch.commit()` call
     *  across the DB facades.
     *
     *  Why not just await the write? With Firestore's offline persistence
     *  (default), writes resolve immediately against the local cache and
     *  silently queue for retry — the promise *succeeds* even when the server
     *  is unreachable. `waitForPendingWrites` also behaves unreliably here:
     *  it can resolve immediately if the SDK has stopped attempting retries.
     *
     *  So after each tracked write we issue a `getDocFromServer` probe
     *  against the user's own creator doc. That call explicitly bypasses the
     *  cache, so it rejects immediately when the network is down. Concurrent
     *  writes share a single in-flight probe (the `writeCheckInFlight` flag),
     *  so a burst of edits costs one round-trip, not N.
     *
     *  Returns the original promise so callers can `await` it as before. */
    track<T>(write: Promise<T>): Promise<T> {
        // Fire the probe in parallel with the write — NOT in `.then`. Writes
        // with the emulator stopped (or any unreachable backend) hang
        // indefinitely instead of rejecting, so waiting for the write to
        // settle never gives us a signal. The probe is independent.
        this.scheduleWriteCheck();
        return write;
    }

    private scheduleWriteCheck() {
        if (this.writeCheckInFlight) return;
        if (firestore === undefined || this.user === null) return;
        this.writeCheckInFlight = true;
        const fs = firestore;
        const uid = this.user.uid;
        Promise.race([
            getDocFromServer(doc(fs, CreatorCollection, uid)),
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error('timeout')),
                    Database.WRITE_CHECK_TIMEOUT_MS,
                ),
            ),
        ])
            .then(
                () => this.markFirebaseReachable(),
                () => this.markFirebaseDisconnected(),
            )
            .finally(() => {
                this.writeCheckInFlight = false;
            });
    }

    /** Install browser network listeners. Returns a cleanup function. SSR-safe. */
    installNetworkListeners(): () => void {
        if (typeof window === 'undefined') return () => {};

        const handleOnline = () => onlineStatus.set(true);
        const handleOffline = () => onlineStatus.set(false);
        const handleVisibility = () => {
            // When the tab becomes visible and the browser believes we're
            // online, optimistically clear the Firebase-unreachable flag. A
            // subsequent op will confirm or re-mark it.
            if (document.visibilityState === 'visible' && navigator.onLine)
                this.markFirebaseReachable();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibility);
        onlineStatus.set(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
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
                this.track(
                    setDoc(
                        doc(firestore, CreatorCollection, this.user.uid),
                        this.Settings.toObject(),
                    ),
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
        if (auth === undefined) {
            // No Firebase Auth configured — release the banner gate so the
            // browser-online signal still works in this environment.
            authAttempted.set(true);
            return;
        }
        // Keep the user store in sync.
        this.authUnsubscribe = onAuthStateChanged(auth, async (newUser) => {
            // First Auth resolution releases the connection-banner gate.
            authAttempted.set(true);
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

        // Tell the how-to database.
        this.HowTos.syncUser();
    }

    /** Clean up listeners */
    clean() {
        if (this.authUnsubscribe) this.authUnsubscribe();
        if (this.authRefreshUnsubscribe) this.authRefreshUnsubscribe();

        this.Projects.unmount();
        this.Galleries.clean();
        this.Chats.ignore();
        this.Characters.ignore();
        this.HowTos.ignore();
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
            await this.track(
                deleteDoc(doc(firestore, CreatorCollection, user.uid)),
            );
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
export const HowTos = DB.HowTos;

/** The effective animation factor as a plain number, resolving `null` (auto)
 * against the OS `prefers-reduced-motion` setting: 0 when the OS prefers
 * reduced motion, 1 otherwise. Explicit user picks always win. */
export const animationFactor = derived(
    [Settings.settings.animationFactor.value, prefersReducedMotion],
    ([raw, reduced]) => (raw === null ? (reduced ? 0 : 1) : raw),
);
export const animationDuration = derived(
    animationFactor,
    (factor) => factor * 200,
);
export const tutorialProgress = Settings.settings.tutorial.value;
export const arrangement = Settings.settings.arrangement.value;
export const locales = DB.Locales.locales;
export const localesReady = DB.Locales.localesReady;
export const writingLayout = Settings.settings.writingLayout.value;
export const camera = Settings.settings.camera.value;
export const dark = Settings.settings.dark.value;
export const spaceIndicator = Settings.settings.space.value;
export const showLines = Settings.settings.lines.value;
export const showAnnotations = Settings.settings.annotations.value;
export const mic = Settings.settings.mic.value;
export const voice = Settings.settings.say.value;
export const blocks = Settings.settings.blocks.value;
export const blockDensity = Settings.settings.blockDensity.value;
export const howToNotifications = Settings.settings.howToNotifications.value;
export const status = DB.Status;

/** True when the browser reports online; defaults to true on the server. */
export const onlineStatus: Writable<boolean> = writable(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
);

/** True when Firebase requests are believed to be reachable. Flipped by
 *  Database.setStatus: Saved → reachable, Error → unreachable. */
export const firebaseReachable: Writable<boolean> = writable(true);

/** Sticky flag: true once a Firebase op has succeeded at least once this
 *  session. Used to suppress the "unreachable" banner during the initial
 *  connection phase — we can't tell "connecting" from "down" without a prior
 *  success, so until then we trust the standard page-level loading UI. */
export const firebaseEverConnected: Writable<boolean> = writable(false);

/** Sticky flag: true once Firebase Auth has attempted to resolve (either with
 *  a cached/fresh user, or null). Used as the master banner gate — even the
 *  browser-`offline` signal can lie briefly during page reload, so we wait for
 *  Auth to report in (which happens quickly even offline via local
 *  persistence) before showing any connection feedback. */
export const authAttempted: Writable<boolean> = writable(false);

/** Derived: true when we should warn the user the page is non-functional —
 *  either the browser reports offline (definitive once auth attempted), or
 *  Firebase has failed AFTER having successfully connected at least once. */
export const disconnected: Readable<boolean> = derived(
    [onlineStatus, firebaseReachable, firebaseEverConnected, authAttempted],
    ([online, fb, ever, attempted]) =>
        attempted && (!online || (!fb && ever)),
);

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        DB.Locales.refreshLocales();
    });
}
