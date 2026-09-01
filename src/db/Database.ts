import { ensureAuth, firestore } from '@db/firebase';
import { FirebaseError } from 'firebase/app';
import concretize from '@locale/concretize';
import { type LocaleTextAccessor } from '@locale/Locales';
import { getBestSupportedLocales } from '@locale/getBestSupportedLocales';
import { type SupportedLocale } from '@locale/SupportedLocales';
// Value symbols from firebase/auth are dynamically imported at use so the auth
// SDK stays out of the eager chunk; only the erased types are imported here.
import { type Auth, type Unsubscribe, type User } from 'firebase/auth';
import {
    deleteDoc,
    doc,
    getDoc,
    getDocFromServer,
    setDoc,
} from 'firebase/firestore';
import {
    derived,
    get,
    writable,
    type Readable,
    type Writable,
} from 'svelte/store';
import { prefersDarkScheme } from '@db/settings/prefersDarkScheme';
import { prefersReducedMotion } from '@db/settings/prefersReducedMotion';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { type FormattedText } from '@locale/LocaleText';
import { CharactersDatabase } from '@db/characters/CharacterDatabase.svelte';
import { ChatDatabase } from '@db/chats/ChatDatabase.svelte';
import CreatorDatabase, {
    CreatorCollection,
} from '@db/creators/CreatorDatabase';
import GalleryDatabase from '@db/galleries/GalleryDatabase.svelte';
import { HowToDatabase } from '@db/howtos/HowToDatabase.svelte';
import LocalesDatabase from '@db/locales/LocalesDatabase';
import type ProjectsDatabase from '@db/projects/ProjectsDatabase.svelte';
import { Domain, SyncDomains, type SyncDomain } from '@db/Domains';
import { ProjectSchema } from '@db/projects/ProjectSchemas';
import { WordplayDexie } from '@db/WordplayDexie';
import SettingsDatabase from '@db/settings/SettingsDatabase';
import retryableLoad from '@util/retryableLoad';
import { syncStrikes } from '@db/creators/strikes.svelte';
import { syncNotices } from '@db/moderation/notices.svelte';

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

/** The kind of action that failed while persisting a project, mapped to a
 *  user-facing reason message and used to group failures in the Status dialog. */
export const SaveFailureReason = {
    /** Writing to the local IndexedDB-backed cache threw. */
    IndexedDBWriteFailed: 'indexed-db-write-failed',
    /** Like IndexedDBWriteFailed, but for a project with NO cloud copy
     *  (PersistenceType.Local — not signed in / not synced). The local write is
     *  the only copy, so this is real data loss: the message is louder and
     *  nudges sign-in. */
    LocalProjectStorageFailed: 'local-project-storage-failed',
    /** The browser doesn't expose IndexedDB at all. */
    IndexedDBUnsupported: 'indexed-db-unsupported',
    /** A Firestore writeBatch.commit() rejected (whole batch lost). */
    FirestoreBatchFailed: 'firestore-batch-failed',
    /** The project was skipped from the cloud batch because it contained PII. */
    ProjectContainsPII: 'project-contains-pii',
    /** The serialized project exceeds Firestore's per-document limit, so it can
     *  never commit. Reported per project instead of being left in a batch that
     *  would fail — and take every other project in it down — on every attempt. */
    ProjectTooLarge: 'project-too-large',
    /** There were unsaved projects but nowhere to send them: signed out, or no
     *  Firestore at all. Reported so the status can't read "saved" while work
     *  sits on this device only. */
    NoCloudTarget: 'no-cloud-target',
} as const;
export type SaveFailureReason =
    (typeof SaveFailureReason)[keyof typeof SaveFailureReason];

export type SaveFailure = {
    projectId: string;
    projectName: string;
    reason: SaveFailureReason;
    /** Raw technical hint shown dimmed next to the project name —
     *  Firestore error code, DOMException name, etc. Explicit `| undefined`
     *  satisfies `exactOptionalPropertyTypes` for callers that pass through
     *  a possibly-undefined value from a `catch` block. */
    detail?: string | undefined;
};

/** A domain-agnostic save failure, used by the non-project domains (galleries,
 *  characters, how-tos, chats) to surface a write that didn't reach the cloud.
 *  Same shape as the project `SaveFailure` but with a generic item `name`, so
 *  the save-status dialog can render failures from every document type
 *  uniformly. `reason` reuses the project `SaveFailureReason` enum —
 *  `FirestoreBatchFailed` ("couldn't send to the cloud; still safe on this
 *  device") fits any document type. */
export type SaveError = {
    id: string;
    name?: string | undefined;
    reason: SaveFailureReason;
    /** Raw technical hint (e.g. the Firestore error code) shown dimmed. */
    detail?: string | undefined;
};

/** A per-domain count of items saved on this device, confirmed saved in the
 *  cloud, and unsaved (local edits not yet confirmed online). These are
 *  independent facts, not a partition: an item can be on-device-only (neither
 *  in the cloud nor unsaved, e.g. a local-only tutorial project). */
export type SaveCounts = { device: number; cloud: number; unsaved: number };

// Re-exported (imported at the top) from the single source of truth so existing
// `@db/Database` importers (Status.svelte, tests) keep working; new code may
// import from `@db/Domains` directly.
export { Domain, SyncDomains, type SyncDomain };

/** A domain's cloud-sync state for the save-status UI: `initializing` (not yet
 *  subscribed), `syncing` (subscribed, awaiting first snapshot), `updated`
 *  (first snapshot received; `count` items synced), or `failed` (connectivity
 *  error). */
export type SyncStatus = 'initializing' | 'syncing' | 'updated' | 'failed';
export type SyncDomainState = { status: SyncStatus; count: number };

/** Whether an auth event carries a different signed-in identity than the one
 *  last broadcast to the user store (`undefined` = nothing broadcast yet).
 *  Token refreshes re-deliver the same identity and must not re-notify —
 *  see the rationale in {@link Database.login}. Exported for unit testing;
 *  `login` itself needs a browser-initialized Firebase app. */
export function authIdentityChanged(
    lastUid: string | null | undefined,
    user: Pick<User, 'uid'> | null,
): boolean {
    return (user === null ? null : user.uid) !== lastUid;
}

export class Database {
    /** The database of local persisted settings */
    readonly Settings: SettingsDatabase;

    /** The database of loaded locales and settings. Encapsuled to avoid cluttering this central interface to persistence and caches. */
    readonly Locales: LocalesDatabase;

    /** The shared IndexedDB local store mirroring all Firebase data, one table
     *  per domain. A single instance is owned here and shared with every domain
     *  database; never construct a second (Dexie instances declaring different
     *  schemas for the same DB name conflict). */
    readonly localDB = new WordplayDexie();

    /** The projects database, once the language runtime it needs has loaded.
     *  Undefined until then; see loadProjects(). */
    private projects: ProjectsDatabase | undefined = undefined;
    /** The same value as a store, so views that list projects re-render when
     *  the database arrives. A plain field can't do that: a `$derived` reading
     *  it captures `undefined` and never re-runs, which silently leaves the
     *  projects page empty forever. */
    private readonly projectsStore: Writable<ProjectsDatabase | undefined> =
        writable(undefined);

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

    /** The status of persisting the projects. `message` is the generic
     *  explanation used by non-project save paths (settings, snapshot load).
     *  `failures` carries per-project detail when `persist()` fails. */
    readonly Status: Writable<{
        status: SaveStatus;
        message: undefined | ((locale: LocaleText) => FormattedText);
        failures: SaveFailure[];
    }> = writable({
        status: SaveStatus.Saved,
        message: undefined,
        failures: [],
    });

    /** The current Firestore user ID */
    private user: User | null = null;

    /** Realtime query unsubscribers */
    private authUnsubscribe: Unsubscribe | undefined = undefined;
    private authRefreshUnsubscribe: Unsubscribe | undefined = undefined;

    /** Set true while a `waitForPendingWrites` check is racing a timeout.
     *  Concurrent writes share a single check rather than spawning their own. */
    private writeCheckInFlight = false;
    private static WRITE_CHECK_TIMEOUT_MS = 8_000;
    /** Maximum time a one-time read may take before we give up and treat the
     *  backend as unreachable. Without it, an unreachable backend makes
     *  `getDoc`/`getDocs` hang for minutes instead of failing fast. */
    private static READ_TIMEOUT_MS = 8_000;
    /** Maximum time an *awaited* one-off write (delete/teacher edit/moderation/
     *  feedback) may take before we give up. The memory-only cache means a
     *  write to an unreachable backend never resolves *or* rejects — it just
     *  hangs — so {@link write} races it against this timeout to fail fast. */
    private static WRITE_TIMEOUT_MS = 8_000;
    /** How long the top-of-page banner ({@link reportBanner}) stays up before it
     *  auto-dismisses. Long enough to read a short failure message. */
    private static BANNER_TIMEOUT_MS = 8_000;
    /** Number of consecutive probe failures. Only marks Firebase unreachable
     *  after two in a row, suppressing false positives under classroom load. */
    private writeCheckConsecutiveFailures = 0;

    /** How long a disconnection must persist — while the tab is awake — before
     *  we tell the user about it. Every disconnection signal routes through this
     *  window, speculative and definitive alike, because none of them
     *  distinguishes a real outage from the handshake that follows a tab wake, a
     *  laptop resume, or a Firestore stream reconnect. Those all recover in a
     *  few seconds; 30s is long enough to sit through them and short enough that
     *  a genuinely broken connection surfaces before much work accumulates. */
    private static DISCONNECT_CONFIRM_MS = 30_000;

    /** Pending-disconnection timer ({@link confirmDisconnect}); cancelled by
     *  {@link markFirebaseReachable} on any success. */
    private pendingFailureTimer: ReturnType<typeof setTimeout> | undefined =
        undefined;

    /** Wall-clock time the pending window was scheduled, so the callback can
     *  tell a window that genuinely elapsed from one the browser deferred while
     *  the tab was frozen. See {@link confirmDisconnect}. */
    private pendingFailureStart = 0;

    /** True once this disconnection episode has raised its banner, so the stream
     *  of failures during one outage doesn't keep re-raising it (and resetting
     *  its auto-dismiss timer, which would leave it up forever). Re-armed by
     *  {@link markFirebaseReachable} so a later outage banners again. */
    private connectionBannerShown = false;

    /** The message this episode's connection banner put up, kept so recovery can
     *  take down that banner and only that one. */
    private connectionBannerMessage: LocaleTextAccessor | undefined = undefined;

    /** Auto-dismiss timer for the top-of-page banner ({@link reportBanner}). */
    private bannerTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    /** Latch so the near-quota storage warning ({@link checkStorageHeadroom})
     *  fires at most once per session instead of on every save. */
    private storageWarned = false;
    /** Fraction of the storage quota at/above which we warn the user. */
    private static STORAGE_WARN_THRESHOLD = 0.9;

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
        this.Galleries = new GalleryDatabase(this);
        this.Creators = new CreatorDatabase(this);
        this.Chats = new ChatDatabase(this);
        this.Characters = new CharactersDatabase(this);
        this.HowTos = new HowToDatabase(this);
    }

    getUser() {
        return this.user;
    }

    /** Total items across every domain with edits not yet confirmed saved in
     *  the cloud. Reads each domain's reactive `saveCounts`, so it's both
     *  reactive (when read in a component `$derived`) and safe to read
     *  synchronously (e.g. from a `beforeunload` handler). Used to warn/guard
     *  before destructive actions (logout, account delete, leaving the page)
     *  that would discard local-only edits. */
    getUnsavedCount(): number {
        return (
            (this.projects?.saveCounts.unsaved ?? 0) +
            this.Galleries.saveCounts.unsaved +
            this.Characters.saveCounts.unsaved +
            this.HowTos.saveCounts.unsaved +
            this.Chats.saveCounts.unsaved
        );
    }

    getUserID() {
        return this.user ? this.user.uid : null;
    }

    getUserEmail() {
        return this.user ? this.user.email : null;
    }

    /**
     * A stable per-device identifier used as the `writer` field in project
     * field stamps. Persisted in localStorage so reloads keep the same ID,
     * which is what makes Lamport-counter tiebreaks deterministic across
     * tabs and reloads. We don't use the user UID directly because the same
     * user editing on two devices needs distinct writer IDs for convergence —
     * see VectorClock.compareStamps and the #135 fix.
     */
    getWriterID(): string {
        if (typeof window === 'undefined') return '';
        const key = 'wordplay.writerID';
        let id = window.localStorage.getItem(key);
        if (id === null) {
            id =
                typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `w-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
            window.localStorage.setItem(key, id);
        }
        return id;
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
        this.Status.set({ status, message, failures: [] });
    }

    /** Mark a save as failed with one entry per affected project. The Status
     *  dialog groups these by reason so users can see which projects didn't
     *  save and why. */
    setSaveFailures(failures: SaveFailure[]) {
        this.Status.set({
            status: SaveStatus.Error,
            message: undefined,
            failures,
        });
    }

    /** Surface a transient message in the app-wide top-of-page banner (rendered
     *  once in +layout.svelte). Use for one-off action failures the user should
     *  see immediately but that aren't tied to a form field — a delete that
     *  couldn't reach the cloud, a moderation flag that didn't save. Auto-
     *  dismisses after a few seconds; a newer message replaces an older one.
     *  Screen-reader announcement happens in Banner.svelte via the centralized
     *  Announcer, so this stays a plain store write.
     *
     *  Pass the originating `error` (when there is one) and it's logged here, so
     *  failure call sites don't each repeat a `console.error` before calling
     *  this — one consistent place logs and surfaces. */
    reportBanner(message: LocaleTextAccessor, error?: unknown) {
        if (error !== undefined) console.error(error);
        appBanner.set(message);
        if (this.bannerTimer !== undefined) clearTimeout(this.bannerTimer);
        this.bannerTimer = setTimeout(() => {
            this.bannerTimer = undefined;
            // Only clear if this is still the message we set — a later
            // reportBanner may have replaced it with its own timer.
            appBanner.update((current) =>
                current === message ? undefined : current,
            );
        }, Database.BANNER_TIMEOUT_MS);
    }

    /** Record an automatic (non-user-action) load failure. Never banners: a read
     *  the user didn't ask for has no antecedent in an app-wide strip, and the
     *  page that raised it can't take the message with it when it leaves — so a
     *  denied background read showed up as an unexplained error over pages that
     *  had loaded fine. Callers that need to tell the user show an inline notice
     *  next to the missing content instead.
     *
     *  A connectivity cause additionally feeds {@link markFirebaseFailed}. One
     *  failed read is no evidence of an outage — a tab that's been frozen fails
     *  its first read on wake and reconnects a second later — so the banner is
     *  raised from {@link confirmDisconnect} only if the disconnection persists. */
    reportLoadFailure(error: unknown) {
        console.error(error);
        if (this.isConnectivityError(error)) this.markFirebaseFailed();
    }

    /** Ask the browser to make this origin's storage persistent, so it's exempt
     *  from automatic eviction under disk pressure (best-effort → persistent).
     *  Idempotent and browser-only: no-ops on the server, when the API is
     *  missing, or when already persisted. Chrome/Safari grant by engagement
     *  heuristics; Firefox may show a one-time "store data" permission prompt.
     *  Fire-and-forget — failure just leaves us in best-effort mode. */
    async requestPersistentStorage(): Promise<void> {
        if (typeof navigator === 'undefined') return;
        const storage = navigator.storage;
        if (storage?.persist === undefined || storage.persisted === undefined)
            return;
        try {
            if (await storage.persisted()) return;
            await storage.persist();
        } catch (error) {
            console.error('Persistent storage request failed', error);
        }
    }

    /** Warn the user (once per session) when this device's storage is nearly
     *  full, before writes start failing. Browser-only and best-effort: no-ops
     *  without the Storage estimate API. */
    async checkStorageHeadroom(): Promise<void> {
        if (this.storageWarned || typeof navigator === 'undefined') return;
        const storage = navigator.storage;
        if (storage?.estimate === undefined) return;
        try {
            const { usage, quota } = await storage.estimate();
            if (
                usage !== undefined &&
                quota !== undefined &&
                quota > 0 &&
                usage / quota >= Database.STORAGE_WARN_THRESHOLD
            ) {
                this.storageWarned = true;
                this.reportBanner((l) => l.ui.banner.storageNearFull);
            }
        } catch (error) {
            console.error('Storage estimate failed', error);
        }
    }

    /** Speculative disconnect signal (e.g. Firestore serving from cache). Starts
     *  the confirmation window only once we've connected at least once this
     *  session: before a first success we can't tell "connecting" from "down",
     *  so we trust the page-level loading UI instead. */
    markFirebaseDisconnected() {
        firebaseReachable.set(false);
        if (get(firebaseEverConnected)) this.confirmDisconnect();
    }

    /** Definitive connectivity failure (a read/write timed out, or a listener
     *  errored with a connectivity code). Starts the confirmation window even if
     *  we never successfully connected this session — a user whose connection is
     *  broken from the start would otherwise never hear about it. */
    markFirebaseFailed() {
        firebaseReachable.set(false);
        this.confirmDisconnect();
    }

    /** Start (or leave running) the window a disconnection must survive before
     *  we tell the user. Measured from the FIRST signal — a later one must not
     *  restart it, or a steady stream of listener errors would defer the report
     *  forever. {@link markFirebaseReachable} cancels it on any success. */
    private confirmDisconnect() {
        if (this.pendingFailureTimer !== undefined) return;
        this.pendingFailureStart = Date.now();
        this.pendingFailureTimer = setTimeout(() => {
            this.pendingFailureTimer = undefined;

            // Time the tab spent frozen is not evidence of an outage. A browser
            // suspends a backgrounded tab along with its timers and its in-
            // flight requests, then fires every overdue timer at once on
            // resume — so a window that took far longer than it asked for never
            // actually ran, and a hidden tab has had no chance to reconnect
            // (and nobody watching to warn). Either way, start a fresh window
            // rather than reporting a disconnection we haven't observed.
            const elapsed = Date.now() - this.pendingFailureStart;
            const hidden =
                typeof document !== 'undefined' &&
                document.visibilityState !== 'visible';
            if (hidden || elapsed > Database.DISCONNECT_CONFIRM_MS * 2) {
                this.confirmDisconnect();
                return;
            }

            firebaseFailed.set(true);
            this.raiseConnectionBanner();
        }, Database.DISCONNECT_CONFIRM_MS);
    }

    /** Tell the user the connection is gone, once per disconnection episode.
     *  Repeating it would reset the banner's auto-dismiss timer on every failing
     *  read, leaving it up for the whole outage. */
    private raiseConnectionBanner() {
        if (this.connectionBannerShown) return;
        this.connectionBannerShown = true;
        // Same distinction the save-status dialog draws: the browser says it's
        // offline, versus the browser thinks it's online but the cloud isn't
        // answering (a VPN, extension, or filter in the way).
        this.connectionBannerMessage = get(onlineStatus)
            ? (l: LocaleText) => l.ui.connection.unreachable
            : (l: LocaleText) => l.ui.connection.offline;
        this.reportBanner(this.connectionBannerMessage);
    }

    markFirebaseReachable() {
        // A success makes any pending disconnection moot — cancel it so a
        // recovered transient never surfaces the banner.
        if (this.pendingFailureTimer !== undefined) {
            clearTimeout(this.pendingFailureTimer);
            this.pendingFailureTimer = undefined;
        }
        // The episode is over: take down its banner if it's still showing (but
        // not a newer, unrelated one) and re-arm so a later outage reports
        // again.
        if (this.connectionBannerMessage !== undefined) {
            const message = this.connectionBannerMessage;
            appBanner.update((current) =>
                current === message ? undefined : current,
            );
            this.connectionBannerMessage = undefined;
        }
        this.connectionBannerShown = false;
        // Was the cloud unreachable before this success? If so, this is a
        // recovery — replay any edits that didn't reach the server. We can't
        // rely on the browser `online` event for this: Firebase often goes
        // unreachable while the browser stays online (proxy/AV churn, transient
        // Firestore outages), so recovery has no `online` event.
        const recovered = get(firebaseFailed) || !get(firebaseReachable);
        firebaseReachable.set(true);
        firebaseEverConnected.set(true);
        firebaseFailed.set(false);
        if (recovered) this.flushUnsavedWork();
    }

    /**
     * Bring the project subsystem online: read the local cache and, if signed
     * in, start syncing. Kept off the import path and out of the constructor
     * because hydration deserializes every cached project, and each one builds
     * a `Basis` — seconds of main-thread work on a phone, spent before first
     * paint on pages that show no projects at all. Idempotent.
     *
     * Waiting is safe for unsaved work: edits are recorded in a durable dirty
     * table, so anything pending replays once this runs.
     */
    /**
     * Load the language runtime and the projects database that needs it, once.
     *
     * The dynamic import lives inside this method on purpose: a module-level
     * await anywhere in the app graph reorders WebKit's module evaluation
     * across the route/db import cycle and crashes hydration (see
     * src/util/getTemporal.ts).
     *
     * Memoized across successes but not failures — this is the app's largest
     * chunk, so a single failed fetch on a flaky connection would otherwise
     * leave every project view broken for the life of the tab.
     */
    private readonly loadProjectsOnce = retryableLoad(async () => {
        const { Projects } = await import('@db/projects/Projects');
        this.projects = Projects;
        this.projectsStore.set(Projects);
        return Projects;
    });

    loadProjects(): Promise<ProjectsDatabase> {
        return this.loadProjectsOnce();
    }

    /** The projects database if the runtime has already loaded, else
     *  undefined. For synchronous paths that must not force a load — unsaved
     *  counts read from `beforeunload`, reconnect flushes, locale re-sync —
     *  where "not loaded" correctly means "nothing in memory to act on". */
    get MaybeProjects(): ProjectsDatabase | undefined {
        return this.projects;
    }

    /** {@link MaybeProjects} as a store, for views that must re-render when the
     *  projects database finishes loading. */
    get LoadedProjects(): Readable<ProjectsDatabase | undefined> {
        return this.projectsStore;
    }

    /** Whether the projects database is loaded and usable synchronously. */
    get projectsReady(): boolean {
        return this.projects !== undefined;
    }

    /**
     * A project's name and gallery, read straight from its stored document.
     *
     * For paths that need to label a project rather than work with it — chat
     * notifications, moderation lists. Constructing a `Project` to ask its
     * name would build a `Basis` and pull the whole language runtime into the
     * footer, which renders on every page.
     */
    async getProjectSummary(
        id: string,
    ): Promise<{ name: string; gallery: string | null } | undefined> {
        try {
            const local = await this.localDB.getProject(id);
            if (local !== undefined)
                return { name: local.name, gallery: local.gallery };
        } catch {
            // Fall through to the cloud copy below.
        }
        if (firestore === undefined) return undefined;
        try {
            const remote = await getDoc(doc(firestore, Domain.Projects, id));
            const data = remote.data();
            if (data === undefined) return undefined;
            const serialized = ProjectSchema.safeParse(data);
            return serialized.success
                ? {
                      name: serialized.data.name,
                      gallery: serialized.data.gallery,
                  }
                : undefined;
        } catch {
            return undefined;
        }
    }

    async startProjectWork(): Promise<void> {
        const projects = await this.loadProjects();
        await projects.start();
        // Installed here rather than at page load: these handlers flush
        // project edits on unload, and until projects are in memory there is
        // nothing for them to flush.
        this.cleanupSaveOnUnload ??= projects.installSaveOnUnloadListeners();
        if (this.user !== null) projects.saveSoon();
    }

    /** Removes the save-on-unload handlers installed by startProjectWork. */
    private cleanupSaveOnUnload: (() => void) | undefined = undefined;

    /** Whether this device has project work worth starting: a signed-in
     *  creator, or projects cached locally from a previous visit. */
    async shouldStartProjectWork(): Promise<boolean> {
        if (this.user !== null) return true;
        try {
            return (await this.localDB.projects.count()) > 0;
        } catch {
            return false;
        }
    }

    /** Re-push every domain's unsaved edits to the cloud. Each call is a no-op
     *  when that domain has nothing unsaved, so it's safe to fire on any
     *  reconnect signal (browser `online` or Firebase reachability recovery). */
    private flushUnsavedWork() {
        this.projects?.saveSoon();
        void this.Galleries.flushUnsaved();
        void this.Characters.flushUnsaved();
        void this.HowTos.flushUnsaved();
        void this.Chats.flushUnsaved();
    }

    /** Per-domain cloud-sync status, surfaced in the save-status dialog as
     *  "syncing with the cloud" with granular progress. A domain's realtime
     *  listener reports `syncing` when it subscribes, `updated` (with a synced
     *  item count) when its first snapshot lands, and `failed` on a
     *  connectivity error. */
    private updateSync(domain: SyncDomain, partial: Partial<SyncDomainState>) {
        syncState.update((state) => ({
            ...state,
            [domain]: { ...state[domain], ...partial },
        }));
    }

    markSyncing(domain: SyncDomain) {
        this.updateSync(domain, { status: 'syncing' });
    }

    markSynced(domain: SyncDomain, count: number) {
        this.updateSync(domain, { status: 'updated', count });
    }

    markSyncFailed(domain: SyncDomain) {
        this.updateSync(domain, { status: 'failed' });
    }

    /** Whether an error reflects a connectivity problem (so it should trip the
     *  unreachable banner) versus an expected outcome like a permission denial
     *  or missing doc (which must not). Also true for our own timeout Errors. */
    isConnectivityError(error: unknown): boolean {
        if (error instanceof FirebaseError)
            return [
                'unavailable',
                'deadline-exceeded',
                'cancelled',
                'internal',
                'aborted',
                'resource-exhausted',
            ].includes(error.code);
        // Our timeout rejection, or any non-Firebase network error.
        return error instanceof Error;
    }

    /** Shared handler for realtime listener (`onSnapshot`) errors. Always
     *  terminal for the domain's sync state, so the save-status button stops
     *  its "loading" spinner and the dialog shows "failed". Only a
     *  connectivity error additionally feeds the offline/unreachable state;
     *  a permission or index error is the server answering — treating it as
     *  a disconnection made the connection banner flap whenever one denied
     *  listener alternated with healthy ones. Non-connectivity errors instead
     *  surface through the optional save-status message. */
    reportListenerError(
        domain: SyncDomain,
        error: unknown,
        message?: (locale: LocaleText) => FormattedText,
    ) {
        if (error instanceof FirebaseError)
            console.error(error.code, error.message);
        else console.error(error);
        this.markSyncFailed(domain);
        if (this.isConnectivityError(error)) {
            this.markFirebaseFailed();
            return;
        }
        if (message !== undefined) this.setStatus(SaveStatus.Error, message);
    }

    /** Wrap a one-time Firebase read (`getDoc`/`getDocs`) so it fails fast
     *  instead of hanging when the backend is unreachable, and so reads — not
     *  just writes — feed the reachability banner. Races the read against a
     *  timeout: on success we mark reachable; on a connectivity failure we mark
     *  failed. The error is rethrown either way, so callers' existing try/catch
     *  keep returning their usual `undefined`/`false`. */
    async read<T>(read: Promise<T>): Promise<T> {
        return this.raced(read, Database.READ_TIMEOUT_MS, 'read-timeout');
    }

    /** Race a Firebase op against a timeout, feeding the outcome to the
     *  connection state: success marks reachable, a connectivity failure starts
     *  the confirmation window. The error is rethrown either way, so callers'
     *  existing try/catch keep behaving as before.
     *
     *  A timeout only counts as a failure if it took roughly as long as it asked
     *  for. A browser freezes a backgrounded tab's timers AND its in-flight
     *  requests, then drains every overdue timer on resume — so the race can
     *  reject the instant the tab wakes, having never given the request a
     *  chance. Charging that to the connection is what made a warmed-up tab
     *  claim the database was unreachable. */
    private async raced<T>(
        work: Promise<T>,
        budget: number,
        label: string,
    ): Promise<T> {
        const started = Date.now();
        try {
            const value = await Promise.race([
                work,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(label)), budget),
                ),
            ]);
            this.markFirebaseReachable();
            return value;
        } catch (error) {
            if (
                this.isConnectivityError(error) &&
                !Database.wasSuspended(started, budget)
            )
                this.markFirebaseFailed();
            throw error;
        }
    }

    /** Whether a timed operation ran far past its budget, meaning the browser
     *  suspended the tab rather than the operation genuinely stalling. */
    private static wasSuspended(started: number, budget: number): boolean {
        return Date.now() - started > budget * 2;
    }

    /** Wrap an *awaited* one-off write (a `deleteDoc`, `batch.commit()`, or a
     *  one-shot `setDoc`/`updateDoc` whose result the caller acts on) so it
     *  fails fast instead of hanging, and feeds the reachability banner. Unlike
     *  {@link track} — which returns immediately and probes connectivity in the
     *  background for the fire-and-forget per-item *save* path — this races the
     *  write against a timeout and resolves/rejects with a definitive outcome:
     *  on success we mark reachable; on a connectivity failure (including our
     *  own timeout) we mark failed. The error is rethrown either way, so callers
     *  must `try/catch` and surface the failure (e.g. a banner or inline
     *  notice) rather than silently dropping the user's action.
     *
     *  Use this for actions where the user is waiting on confirmation and a
     *  silent hang or swallowed error would lose their intent — not for the
     *  high-frequency edit path, which stays on {@link track}/`trackSave`. */
    async write<T>(write: Promise<T>): Promise<T> {
        return this.raced(write, Database.WRITE_TIMEOUT_MS, 'write-timeout');
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
        const started = Date.now();
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
                () => {
                    this.writeCheckConsecutiveFailures = 0;
                    this.markFirebaseReachable();
                },
                () => {
                    // A probe the browser suspended mid-flight tells us nothing,
                    // so it mustn't count toward the consecutive-failure tally.
                    if (
                        Database.wasSuspended(
                            started,
                            Database.WRITE_CHECK_TIMEOUT_MS,
                        )
                    )
                        return;
                    this.writeCheckConsecutiveFailures++;
                    if (this.writeCheckConsecutiveFailures >= 2)
                        this.markFirebaseFailed();
                },
            )
            .finally(() => {
                this.writeCheckInFlight = false;
            });
    }

    /** Install browser network listeners. Returns a cleanup function. SSR-safe. */
    installNetworkListeners(): () => void {
        if (typeof window === 'undefined') return () => {};

        const handleOnline = () => {
            onlineStatus.set(true);
            // Flush any edits whose cloud write didn't complete while offline.
            // (Firebase reachability recovery flushes too — see
            // markFirebaseReachable — covering the case where the browser was
            // never "offline" but the cloud was unreachable.)
            this.flushUnsavedWork();
        };
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

        // No cloud target (logged out / no Firestore): settings live in local
        // storage only, so report saved.
        if (!firestore || !this.user) {
            this.setStatus(SaveStatus.Saved, undefined);
            return;
        }

        // Drive the status off the actual write outcome. Fire-and-forget so a
        // poor connection can't hang; the previous code set Saved synchronously
        // (before the write resolved) and left a rejected setDoc as an unhandled
        // rejection — reporting success even on failure.
        this.track(
            setDoc(
                doc(firestore, CreatorCollection, this.user.uid),
                this.Settings.toObject(),
            ),
        )
            .then(() => this.setStatus(SaveStatus.Saved, undefined))
            .catch(() =>
                this.setStatus(
                    SaveStatus.Error,
                    (l) => l.ui.project.save.settingsUnsaved,
                ),
            );
    }

    /** Start listening to the Firebase Auth user changes. Async because the auth
     *  SDK now loads lazily (it's not needed to display a project); the layout
     *  calls this fire-and-forget from onMount, so auth listeners attach shortly
     *  after first paint rather than blocking it. */
    async login(callback: (use: User | null) => void) {
        let auth: Auth | undefined;
        try {
            auth = await ensureAuth();
        } catch (error) {
            // The auth SDK failed to load (offline, blocked chunk fetch). The
            // layout calls login() fire-and-forget, so swallow the rejection
            // here and release the banner gate; ensureAuth clears its memo on
            // rejection, so a later call genuinely retries.
            console.error(error);
            authAttempted.set(true);
            return;
        }
        if (auth === undefined) {
            // No Firebase Auth configured — release the banner gate so the
            // browser-online signal still works in this environment.
            authAttempted.set(true);
            return;
        }
        const { onAuthStateChanged, onIdTokenChanged } =
            await import('firebase/auth');
        // Notify the app's user store only when the signed-in identity
        // actually changes. Both auth listeners fire on every hourly (or
        // forced) ID-token refresh, and a writable store notifies every
        // subscriber on every set — which remounted user-gated UI (e.g. the
        // Teach area's claim check) and tore down and resubscribed realtime
        // listeners on each refresh. Consumers that need a post-refresh
        // profile update re-set the store themselves (see Profile.svelte).
        let lastNotifiedUid: string | null | undefined = undefined;
        const notify = (newUser: User | null) => {
            if (!authIdentityChanged(lastNotifiedUid, newUser)) return;
            lastNotifiedUid = newUser === null ? null : newUser.uid;
            callback(newUser);
        };
        // Keep the user store in sync.
        this.authUnsubscribe = onAuthStateChanged(auth, async (newUser) => {
            // First Auth resolution releases the connection-banner gate.
            authAttempted.set(true);
            notify(newUser);
            // Update every domain with the new user. updateUser now owns the
            // galleries listener too, bringing each domain online serially in
            // priority order (see startSync) rather than firing them all at once.
            this.updateUser(newUser);
        });
        this.authRefreshUnsubscribe = onIdTokenChanged(
            auth,
            async (newUser) => {
                notify(newUser);
            },
        );
    }

    /** Start a realtime database query on this user's projects, updating them whenever they change. */
    async updateUser(user: User | null) {
        if (firestore === undefined) return;

        // Wipe the local project cache only when a DIFFERENT account takes over
        // this device — that's a real privacy boundary. We intentionally do NOT
        // wipe when `user` is null: a null can be an involuntary auth drop (e.g.
        // a flaky connection that can't refresh the ID token), and erasing a
        // creator's local projects on a transient blip is data loss. A deliberate
        // sign-out clears local data explicitly via Database.logout().
        const remove =
            this.user !== null && user !== null && user.uid !== this.user.uid;

        // Update the user ID
        this.user = user;

        // Always tear down the prior galleries listener before re-evaluating.
        this.Galleries.clean();

        // Settings is a one-off read, not a realtime listener it doesn't
        // contribute to the WebChannel session churn, so sync it immediately
        // regardless of login/logout.
        this.Settings.syncUser();

        // The creator's moderation record (#193). One document, watched
        // regardless of login state so signing out clears it: what it says
        // gates the public-sharing control and raises a notification, and both
        // must be about whoever is signed in now.
        syncStrikes(user);

        // The creator's inbox (#938). Watched the same way and for the same
        // reason: a decision about something they made, or something they
        // reported, can land while the app is open.
        syncNotices(user);

        if (user === null) {
            // Logout (or an involuntary auth drop): tear down every realtime
            // listener and reset the per-domain sync status. These syncUser
            // calls are no-ops/ignores when the user is null.
            this.projects?.syncUser(remove);
            this.Characters.syncUser();
            this.HowTos.syncUser();
            this.Chats.syncUser();
            this.resetSync();
            return;
        }

        // Signed in: bring each domain online serially, in priority order.
        this.startSync(remove);
    }

    /** Monotonic token identifying the current serial-sync run. A new run (a
     *  subsequent auth change) invalidates any in-flight run so a stale
     *  sequence can't keep subscribing listeners after the user changed. */
    private syncSequence = 0;

    /** Reset every domain's sync status back to "initializing". */
    resetSync() {
        syncState.set(freshSyncState());
    }

    /** Bring each domain's realtime sync online one at a time, in priority
     *  order (projects → galleries → characters → how-tos → chats), advancing
     *  to the next only once the current domain reports its first snapshot
     *  ("updated") or an error ("failed") — or a timeout elapses, so a single
     *  slow/offline domain can't stall the rest. Serializing the listener
     *  setup avoids the concurrent-subscription burst that churned the
     *  Firestore WebChannel session ("Unknown SID") on heavy accounts. */
    private async startSync(remove: boolean) {
        const sequence = ++this.syncSequence;
        this.resetSync();

        // Stop issuing further listeners if a newer run superseded this one or
        // the user signed out mid-sequence.
        const superseded = () =>
            sequence !== this.syncSequence || this.user === null;

        // Being signed in IS having project work, so this deliberately loads
        // the projects database rather than skipping when it isn't there —
        // skipping would mean a creator's projects never arrive from the
        // cloud. It does NOT wait for local hydration: reading the cache is a
        // separate concern, and blocking sync behind it stalls every domain.
        (await this.loadProjects()).syncUser(remove);
        // Now that the user is known, flush any project edits whose cloud write
        // didn't confirm before the last reload (durable dirty flag → unsaved on
        // hydrate). persist() only writes unsaved histories, so this is a no-op
        // when everything is saved.
        this.projects?.saveSoon();
        await this.domainSettled(Domain.Projects);
        if (superseded()) return;

        if (remove) await this.Galleries.clearLocal();
        this.Galleries.registerRealtimeUpdates();
        void this.Galleries.flushUnsaved();
        await this.domainSettled(Domain.Galleries);
        if (superseded()) return;

        // A different account is taking over this device: wipe the previous
        // user's locally cached data before syncing, so a cold start can't
        // briefly show it (mirrors Projects' account-switch wipe).
        if (remove) await this.Characters.clearLocal();
        this.Characters.syncUser();
        void this.Characters.flushUnsaved();
        await this.domainSettled(Domain.Characters);
        if (superseded()) return;

        if (remove) await this.HowTos.clearLocal();
        this.HowTos.syncUser();
        void this.HowTos.flushUnsaved();
        await this.domainSettled(Domain.HowTos);
        if (superseded()) return;

        if (remove) await this.Chats.clearLocal();
        this.Chats.syncUser();
        void this.Chats.flushUnsaved();
    }

    /** Resolve once the given domain reaches a terminal first-load status
     *  ("updated" or "failed"), or after a timeout so an offline/slow domain
     *  doesn't stall the serial init indefinitely. */
    private domainSettled(domain: SyncDomain): Promise<void> {
        return new Promise((resolve) => {
            let settled = false;
            // `let` (not `const`) + optional call: svelte's subscribe fires
            // synchronously with the current value, so if the domain is already
            // terminal (e.g. it failed fast), finish() runs DURING subscribe,
            // before `unsubscribe` is assigned. A `const` would throw a
            // temporal-dead-zone ReferenceError there (and abort startSync,
            // stalling every later domain); this stays undefined and we
            // unsubscribe right after assignment instead.
            let unsubscribe: (() => void) | undefined;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                unsubscribe?.();
                resolve();
            };
            const timer = setTimeout(finish, DOMAIN_SETTLE_TIMEOUT_MS);
            unsubscribe = syncState.subscribe((state) => {
                const status = state[domain].status;
                if (status === 'updated' || status === 'failed') finish();
            });
            // If the subscribe callback already finished synchronously,
            // `unsubscribe` was assigned after finish ran — tear it down now.
            if (settled) unsubscribe();
        });
    }

    /** Explicit, user-initiated sign-out. Clears the local project cache for
     *  privacy (this device may be shared) BEFORE signing out. This is the only
     *  path that wipes local data on logout — `updateUser` no longer deletes on
     *  a null user, so an involuntary auth drop (a flaky connection that can't
     *  refresh the token) can't erase a creator's local projects. */
    async logout() {
        await (await this.loadProjects()).deleteLocal();
        await this.Characters.clearLocal();
        await this.Chats.clearLocal();
        await this.Galleries.clearLocal();
        await this.HowTos.clearLocal();
        // The local wipe above is the privacy-critical part and is already
        // done; a failing signOut (rare — token refresh hiccup) must not throw
        // out of logout and leave the caller hanging. Worst case the Firebase
        // session lingers until it expires, but this device holds no local data.
        try {
            const auth = await ensureAuth();
            if (auth) await auth.signOut();
        } catch (err) {
            console.error('signOut failed after local wipe', err);
        }
    }

    /** Clean up listeners */
    clean() {
        this.cleanupSaveOnUnload?.();
        this.cleanupSaveOnUnload = undefined;
        if (this.authUnsubscribe) this.authUnsubscribe();
        if (this.authRefreshUnsubscribe) this.authRefreshUnsubscribe();

        this.projects?.unmount();
        this.Galleries.clean();
        this.Chats.ignore();
        this.Characters.ignore();
        this.HowTos.ignore();
    }

    /** Delete account, including all projects, settings, and user.
     *
     *  Returns a three-way outcome rather than a boolean because there's an
     *  inherent partial-failure window: the creator doc MUST be deleted while
     *  still authenticated (the security rules require it), so it goes before
     *  `deleteUser`. If the creator doc delete succeeds but `deleteUser` then
     *  fails, the user's data is gone but their auth account remains — a state
     *  the caller must explain differently from a clean failure (where nothing
     *  irreversible happened and a retry is safe). The durable cleanup for an
     *  orphaned auth account is a server-side Cloud Function sweep (out of scope
     *  here); this just reports the situation honestly.
     *
     *  - `'deleted'` — everything removed.
     *  - `'failed'`  — failed before the creator doc was deleted; safe to retry.
     *  - `'partial'` — data removed but account removal didn't finish. */
    async deleteAccount(): Promise<'deleted' | 'failed' | 'partial'> {
        // Not logged in? Do nothing.
        const user = this.getUser();
        if (user === null) return 'failed';

        // No firestore? Do nothing.
        if (firestore === undefined) return 'failed';

        try {
            await (await this.loadProjects()).deleteOwnedProjects();
        } catch (err) {
            this.reportBanner((l) => l.ui.banner.deleteFailed, err);
            return 'failed';
        }

        // Projects gone; delete the creator doc (while still authed), then the
        // auth user. Use write() so neither call can hang on an unreachable
        // backend. Track whether the creator doc landed so we can tell apart a
        // clean failure from the data-gone-but-account-remains partial window.
        let creatorDocDeleted = false;
        try {
            await this.write(
                deleteDoc(doc(firestore, CreatorCollection, user.uid)),
            );
            creatorDocDeleted = true;
            const { deleteUser } = await import('firebase/auth');
            await this.write(deleteUser(user));
        } catch (err) {
            // Partial: data gone but the account remains — surface the specific
            // explanation; otherwise a generic delete-failed banner.
            if (creatorDocDeleted) {
                this.reportBanner(
                    (l) => l.ui.page.login.error.deletePartial,
                    err,
                );
                return 'partial';
            }
            this.reportBanner((l) => l.ui.banner.deleteFailed, err);
            return 'failed';
        }

        return 'deleted';
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

export const LoadedProjects = DB.LoadedProjects;
export const Settings = DB.Settings;
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
export const tutorialState = Settings.settings.tutorial.value;
export const tutorialMode = derived(tutorialState, (state) => state.mode);
export const toursTaken = Settings.settings.tours.value;
/** How much of each chat thread this creator has read, so the "new replies"
 *  marker updates the moment a thread is opened. */
export const chatThreadsSeen = Settings.settings.chatThreads.value;
export const contrastLanguage = Settings.settings.contrastLanguage.value;
export const arrangement = Settings.settings.arrangement.value;
export const stagePlacement = Settings.settings.stagePlacement.value;
export const locales = DB.Locales.locales;
export const localesReady = DB.Locales.localesReady;
export const writingLayout = Settings.settings.writingLayout.value;
export const camera = Settings.settings.camera.value;
export const dark = Settings.settings.dark.value;

/** The effective color scheme as a plain boolean, resolving `DarkSetting`'s
 * `null` (auto) against the OS `prefers-color-scheme` query. Explicit user
 * picks always win, mirroring how `animationFactor` resolves its own auto. */
export const darkMode = derived(
    [Settings.settings.dark.value, prefersDarkScheme],
    ([raw, os]) => raw ?? os,
);
export const adaptOutput = Settings.settings.adaptOutput.value;

/** Whether program output should be adapted to a dark canvas right now: the
 * viewer is in dark mode and hasn't asked for the original colors. Whether a
 * given stage is actually adapted also depends on its own background — an
 * already-dark stage is left alone. */
export const adaptingOutput = derived(
    [darkMode, adaptOutput],
    ([isDark, adapt]) => isDark && adapt,
);
export const spaceIndicator = Settings.settings.space.value;
export const insertTab = Settings.settings.tab.value;
export const showLines = Settings.settings.lines.value;
export const wrap = Settings.settings.wrap.value;
export const showAnnotations = derived(
    Settings.settings.annotations.value,
    ($a) => $a.shown,
);
export const annotationsWidth = derived(
    Settings.settings.annotations.value,
    ($a) => $a.width,
);
export const showWellspring = derived(
    Settings.settings.wellspring.value,
    ($w) => $w.shown,
);
export const wellspringWidth = derived(
    Settings.settings.wellspring.value,
    ($w) => $w.width,
);
export const mic = Settings.settings.mic.value;
export const voice = Settings.settings.say.value;
export const blocks = Settings.settings.blocks.value;
export const words = Settings.settings.words.value;
export const blockDensity = Settings.settings.blockDensity.value;
export const howToNotifications = Settings.settings.howToNotifications.value;
export const musicVisualization = Settings.settings.musicVisualization.value;
export const musicVolume = Settings.settings.musicVolume.value;
export const musicDucking = Settings.settings.musicDucking.value;
export const haptics = Settings.settings.haptics.value;
export const cues = Settings.settings.cues.value;
export const animationCues = Settings.settings.animationCues.value;
export const contactCues = Settings.settings.contactCues.value;
export const captionSize = Settings.settings.captionSize.value;
export const projectFolders = Settings.settings.projectFolders.value;
export const projectSort = Settings.settings.projectSort.value;
export const status = DB.Status;

/** Per-domain cloud-sync state, updated by each domain's realtime listener via
 *  Database.markSyncing/markSynced/markSyncFailed and surfaced in the
 *  save-status dialog. Starts `initializing` for every domain. */
/** How long the serial init waits for one domain's first snapshot before
 *  moving on, so a single slow or offline domain can't stall the rest. */
const DOMAIN_SETTLE_TIMEOUT_MS = 8_000;

function freshSyncState(): Record<SyncDomain, SyncDomainState> {
    return {
        projects: { status: 'initializing', count: 0 },
        galleries: { status: 'initializing', count: 0 },
        characters: { status: 'initializing', count: 0 },
        howtos: { status: 'initializing', count: 0 },
        chats: { status: 'initializing', count: 0 },
    };
}
export const syncState: Writable<Record<SyncDomain, SyncDomainState>> =
    writable(freshSyncState());

/** The current top-of-page banner message, or undefined when none. Set via
 *  {@link Database.reportBanner} (auto-dismissing) and rendered once by
 *  Banner.svelte in +layout.svelte. A plain message store, separate from the
 *  sticky connection state and the per-item save errors. */
export const appBanner: Writable<LocaleTextAccessor | undefined> =
    writable(undefined);

/** True when the browser reports online; defaults to true on the server. */
export const onlineStatus: Writable<boolean> = writable(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
);

/** True when Firebase requests are believed to be reachable. Flipped by
 *  Database.setStatus: Saved → reachable, Error → unreachable. */
export const firebaseReachable: Writable<boolean> = writable(true);

/** Sticky flag: true once a Firebase op has succeeded at least once this
 *  session. Gates the *speculative* disconnect signal during the initial
 *  connection phase — we can't tell "connecting" from "down" without a prior
 *  success, so until then we trust the standard page-level loading UI. */
export const firebaseEverConnected: Writable<boolean> = writable(false);

/** Sticky flag: true once Firebase Auth has attempted to resolve (either with
 *  a cached/fresh user, or null). Used as the master banner gate — even the
 *  browser-`offline` signal can lie briefly during page reload, so we wait for
 *  Auth to report in (which happens quickly even offline via local
 *  persistence) before showing any connection feedback. */
export const authAttempted: Writable<boolean> = writable(false);

/** True once a disconnection has been *confirmed* — some connectivity signal
 *  (a timed-out read/write, a listener error, or Firestore falling back to
 *  cache) held for `Database.DISCONNECT_CONFIRM_MS` of awake time without a
 *  recovering success. Unlike the raw `firebaseReachable=false`, this is what
 *  the UI reports, so a handshake after a tab wake or a stream reconnect never
 *  reaches the user. Cleared by `markFirebaseReachable()` on any success. */
export const firebaseFailed: Writable<boolean> = writable(false);

/** Derived: true when we should warn the user the page is non-functional —
 *  the browser reports offline (definitive and instantly reversible, so it
 *  needs no confirmation), OR a disconnection survived the confirmation
 *  window. `firebaseReachable` deliberately does NOT appear here: on its own
 *  it's a momentary signal, and it reaches this store only via the window. */
export const disconnected: Readable<boolean> = derived(
    [onlineStatus, authAttempted, firebaseFailed],
    ([online, attempted, failed]) => attempted && (!online || failed),
);

if (import.meta.hot) {
    import.meta.hot.on('locales-update', () => {
        DB.Locales.refreshLocales();
    });
}
