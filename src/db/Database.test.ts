import { FirebaseError } from 'firebase/app';
import { get } from 'svelte/store';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import DefaultLocale from '../locale/DefaultLocale';
import {
    DB,
    Domain,
    SaveStatus,
    SyncDomains,
    appBanner,
    authAttempted,
    disconnected,
    firebaseEverConnected,
    firebaseFailed,
    firebaseReachable,
    onlineStatus,
    status,
    syncState,
} from './Database';

const noopMessage = () => '';

/** How long a disconnection must persist before it's reported. Mirrors
 *  Database.DISCONNECT_CONFIRM_MS, which is private. */
const CONFIRM_MS = 30_000;

/** Resolve whatever the banner store currently holds to its English text, so
 *  cases can assert *which* message showed without reaching into accessors. */
function bannerText(): string | undefined {
    const message = get(appBanner);
    return message === undefined ? undefined : message(DefaultLocale);
}

// Reset stores to a known-good baseline before each case. The singleton DB
// persists across tests in this file, and JSDOM's `navigator.onLine` may be
// `false` at module init. Default each test to "auth has attempted" so the
// banner gate is open; tests that exercise the pre-auth phase reset it.
// markFirebaseReachable() clears the DB's own per-episode banner latch, which
// no store reset can reach.
beforeEach(() => {
    onlineStatus.set(true);
    DB.markFirebaseReachable();
    firebaseEverConnected.set(false);
    appBanner.set(undefined);
    authAttempted.set(true);
});

// The confirmation tests drive fake timers; restore real ones after each test
// so the rest of the suite is unaffected.
afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

test('setStatus updates the save-status store and is decoupled from connection state', () => {
    // setStatus must NOT touch connection state — uploadSettings fires Saved
    // even when no Firestore write happened, which would falsely open the
    // banner gate.
    DB.setStatus(SaveStatus.Saved, undefined);
    expect(get(status).status).toBe(SaveStatus.Saved);
    expect(get(firebaseReachable)).toBe(true);
    expect(get(firebaseEverConnected)).toBe(false);

    DB.setStatus(SaveStatus.Error, noopMessage);
    expect(get(status).status).toBe(SaveStatus.Error);
    expect(get(firebaseReachable)).toBe(true);
    expect(get(firebaseEverConnected)).toBe(false);
});

test('a speculative disconnect is not reported until it survives the window', () => {
    vi.useFakeTimers();
    DB.markFirebaseReachable();
    expect(get(firebaseReachable)).toBe(true);
    expect(get(firebaseEverConnected)).toBe(true);
    expect(get(disconnected)).toBe(false);

    // Firestore falling back to cache is a momentary signal, not a report.
    DB.markFirebaseDisconnected();
    expect(get(firebaseReachable)).toBe(false);
    expect(get(disconnected)).toBe(false);

    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(disconnected)).toBe(true);

    DB.markFirebaseReachable();
    expect(get(disconnected)).toBe(false);
});

test('a speculative disconnect that recovers within the window is never reported', () => {
    // The reported bug: a warmed-up tab serves one cached snapshot while its
    // stream reconnects, then reconnects. The user must see nothing at all.
    vi.useFakeTimers();
    DB.markFirebaseReachable();

    DB.markFirebaseDisconnected();
    vi.advanceTimersByTime(CONFIRM_MS / 3);
    DB.markFirebaseReachable();

    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(disconnected)).toBe(false);
    expect(get(firebaseFailed)).toBe(false);
    expect(bannerText()).toBeUndefined();
});

test('initial connecting phase: explicit disconnect before first success is never reported', () => {
    // Simulates accountExists.catch firing before any successful op. Without a
    // prior success we can't tell "connecting" from "down", so the window
    // never even starts.
    vi.useFakeTimers();
    DB.markFirebaseDisconnected();
    expect(get(firebaseReachable)).toBe(false);
    expect(get(firebaseEverConnected)).toBe(false);
    expect(get(disconnected)).toBe(false);

    vi.advanceTimersByTime(CONFIRM_MS * 2);
    expect(get(disconnected)).toBe(false);
});

test('disconnected reflects onlineStatus regardless of connecting phase', () => {
    // navigator.onLine === false is definitive and instantly reversible, so it
    // needs no confirmation window — report it immediately, even before any
    // Firebase op has run.
    expect(get(firebaseEverConnected)).toBe(false);
    onlineStatus.set(false);
    expect(get(disconnected)).toBe(true);

    onlineStatus.set(true);
    expect(get(disconnected)).toBe(false);
});

test('disconnected is true if either signal goes down (after first connect)', () => {
    vi.useFakeTimers();
    DB.markFirebaseReachable();

    DB.markFirebaseDisconnected();
    vi.advanceTimersByTime(CONFIRM_MS);
    onlineStatus.set(false);
    expect(get(disconnected)).toBe(true);

    // Coming back online doesn't clear a confirmed Firebase failure.
    onlineStatus.set(true);
    expect(get(disconnected)).toBe(true);

    DB.markFirebaseReachable();
    expect(get(disconnected)).toBe(false);
});

test('firebaseEverConnected is sticky — markFirebaseDisconnected does not clear it', () => {
    DB.markFirebaseReachable();
    DB.markFirebaseDisconnected();
    expect(get(firebaseEverConnected)).toBe(true);
});

test('resetSync returns every domain to initializing with a zero count', () => {
    DB.markSynced(Domain.Projects, 7);
    DB.markSyncFailed(Domain.Chats);
    DB.resetSync();
    const state = get(syncState);
    for (const domain of SyncDomains) {
        expect(state[domain].status).toBe('initializing');
        expect(state[domain].count).toBe(0);
    }
});

test('mark* transition only the targeted domain through the sync lifecycle', () => {
    DB.resetSync();

    DB.markSyncing(Domain.Projects);
    expect(get(syncState).projects.status).toBe('syncing');
    // Other domains are untouched.
    expect(get(syncState).galleries.status).toBe('initializing');

    DB.markSynced(Domain.Projects, 12);
    expect(get(syncState).projects.status).toBe('updated');
    expect(get(syncState).projects.count).toBe(12);

    DB.markSyncFailed(Domain.Galleries);
    expect(get(syncState).galleries.status).toBe('failed');
    // The earlier domain's terminal state is preserved.
    expect(get(syncState).projects.status).toBe('updated');
    expect(get(syncState).projects.count).toBe(12);
});

test('a transient failure that recovers within the window never shows the banner', () => {
    // Mirrors a cold-start handshake error the SDK retries and recovers from:
    // markFirebaseFailed should not flash the banner if a success lands first.
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    expect(get(disconnected)).toBe(false);
    expect(get(firebaseFailed)).toBe(false);

    // Recover before the confirmation window elapses.
    vi.advanceTimersByTime(CONFIRM_MS / 3);
    DB.markFirebaseReachable();

    // Past the original deadline, the cancelled timer must not fire.
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(firebaseFailed)).toBe(false);
    expect(get(disconnected)).toBe(false);
    expect(bannerText()).toBeUndefined();
});

test('a failure that persists past the window shows the banner', () => {
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    expect(get(disconnected)).toBe(false);
    expect(bannerText()).toBeUndefined();

    // No recovering success — the failure surfaces after the window.
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(firebaseFailed)).toBe(true);
    expect(get(disconnected)).toBe(true);
    expect(bannerText()).toBe(DefaultLocale.ui.connection.unreachable);
});

test('the banner says "offline" instead when the browser reports offline', () => {
    vi.useFakeTimers();
    onlineStatus.set(false);

    DB.markFirebaseFailed();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(bannerText()).toBe(DefaultLocale.ui.connection.offline);
});

test('repeated failures do not reset the confirmation window', () => {
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    // A second failure partway through must keep the original deadline, not
    // restart it — otherwise a stream of listener errors could defer forever.
    vi.advanceTimersByTime(CONFIRM_MS - 1_000);
    DB.markFirebaseFailed();
    expect(get(firebaseFailed)).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(get(firebaseFailed)).toBe(true);
});

test('one outage raises the banner once; a later outage raises it again', () => {
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(bannerText()).toBe(DefaultLocale.ui.connection.unreachable);

    // Every failing read during the same outage calls markFirebaseFailed. If
    // each re-raised the banner it would reset the auto-dismiss timer forever,
    // so the latch must hold it to one showing.
    appBanner.set(undefined);
    DB.markFirebaseFailed();
    vi.advanceTimersByTime(CONFIRM_MS * 2);
    expect(bannerText()).toBeUndefined();

    // Recovery re-arms it, so a second outage is reported.
    DB.markFirebaseReachable();
    DB.markFirebaseFailed();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(bannerText()).toBe(DefaultLocale.ui.connection.unreachable);
});

test('recovery takes down the connection banner it put up', () => {
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(bannerText()).toBe(DefaultLocale.ui.connection.unreachable);

    DB.markFirebaseReachable();
    expect(bannerText()).toBeUndefined();
});

test('recovery leaves a newer, unrelated banner alone', () => {
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    vi.advanceTimersByTime(CONFIRM_MS);

    // Something else reported after the connection banner went up; recovery
    // must not steal its slot.
    DB.reportBanner((l) => l.ui.banner.storageNearFull);
    DB.markFirebaseReachable();
    expect(bannerText()).toBe(DefaultLocale.ui.banner.storageNearFull);
});

test('a confirmation window that elapses while hidden reports nothing yet', () => {
    // A hidden tab hasn't had a chance to reconnect and has nobody watching, so
    // the window restarts rather than reporting.
    // This suite runs in the node environment, so stand up just the piece of
    // `document` the guard reads.
    vi.useFakeTimers();
    const page = { visibilityState: 'hidden' };
    vi.stubGlobal('document', page);

    DB.markFirebaseFailed();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(firebaseFailed)).toBe(false);
    expect(bannerText()).toBeUndefined();

    // Once visible again, the restarted window can report.
    page.visibilityState = 'visible';
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(firebaseFailed)).toBe(true);

    vi.unstubAllGlobals();
});

test('a window the browser deferred while the tab was frozen reports nothing yet', () => {
    // A frozen tab suspends its timers AND its requests, then drains every
    // overdue timer on resume. That window never actually ran, so charging it
    // to the connection is exactly the false alarm this guards against.
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    vi.setSystemTime(Date.now() + CONFIRM_MS * 10);
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(firebaseFailed)).toBe(false);
    expect(bannerText()).toBeUndefined();

    // The fresh window runs normally and reports.
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(firebaseFailed)).toBe(true);
});

test('reportLoadFailure never banners; a connectivity one reports only if it persists', () => {
    vi.useFakeTimers();
    // The failure is logged, not shown; keep it out of the test output.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // A denied background read has no antecedent in an app-wide strip, and the
    // page that asked can't take the message with it when the user navigates —
    // so it showed up as an unexplained error over pages that had loaded fine.
    DB.reportLoadFailure(new FirebaseError('permission-denied', 'not allowed'));
    expect(bannerText()).toBeUndefined();
    // A denial is also no evidence about the connection.
    expect(get(firebaseFailed)).toBe(false);

    // A connectivity failure still waits out the window, then reports.
    DB.reportLoadFailure(new Error('read-timeout'));
    expect(bannerText()).toBeUndefined();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(bannerText()).toBe(DefaultLocale.ui.connection.unreachable);
});

test('a read whose timeout fires after a suspension does not report a failure', async () => {
    // The race rejects the instant a frozen tab wakes, having never given the
    // request a chance — that isn't evidence the database is unreachable.
    const started = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(started + 60_000);

    await expect(
        DB.read(Promise.reject(new Error('read-timeout'))),
    ).rejects.toThrow('read-timeout');

    expect(get(firebaseFailed)).toBe(false);
    expect(bannerText()).toBeUndefined();
});

test('banner is fully suppressed before authAttempted, even when offline', () => {
    // Mirrors the page-reload flash: navigator.onLine can briefly report false
    // during reload, but Firebase Auth hasn't resolved yet. Suppress entirely.
    vi.useFakeTimers();
    authAttempted.set(false);
    onlineStatus.set(false);
    expect(get(disconnected)).toBe(false);

    DB.markFirebaseReachable();
    DB.markFirebaseDisconnected();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(get(disconnected)).toBe(false);

    authAttempted.set(true);
    expect(get(disconnected)).toBe(true);
});
