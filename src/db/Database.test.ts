import { get } from 'svelte/store';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
    DB,
    Domain,
    SaveStatus,
    SyncDomains,
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

// Reset stores to a known-good baseline before each case. The singleton DB
// persists across tests in this file, and JSDOM's `navigator.onLine` may be
// `false` at module init. Default each test to "auth has attempted" so the
// banner gate is open; tests that exercise the pre-auth phase reset it.
beforeEach(() => {
    onlineStatus.set(true);
    firebaseReachable.set(true);
    firebaseEverConnected.set(false);
    firebaseFailed.set(false);
    authAttempted.set(true);
});

// The failure-confirmation tests drive fake timers; restore real ones after
// each test so the rest of the suite is unaffected.
afterEach(() => {
    vi.useRealTimers();
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

test('markFirebaseReachable opens the banner gate; markFirebaseDisconnected then shows it', () => {
    DB.markFirebaseReachable();
    expect(get(firebaseReachable)).toBe(true);
    expect(get(firebaseEverConnected)).toBe(true);
    expect(get(disconnected)).toBe(false);

    DB.markFirebaseDisconnected();
    expect(get(firebaseReachable)).toBe(false);
    expect(get(disconnected)).toBe(true);

    DB.markFirebaseReachable();
    expect(get(disconnected)).toBe(false);
});

test('initial connecting phase: explicit disconnect before first success does NOT show banner', () => {
    // Simulates accountExists.catch firing before any successful op.
    DB.markFirebaseDisconnected();
    expect(get(firebaseReachable)).toBe(false);
    expect(get(firebaseEverConnected)).toBe(false);
    expect(get(disconnected)).toBe(false);
});

test('disconnected reflects onlineStatus regardless of connecting phase', () => {
    // navigator.onLine === false is definitive — show the offline banner
    // immediately, even before any Firebase op has run.
    expect(get(firebaseEverConnected)).toBe(false);
    onlineStatus.set(false);
    expect(get(disconnected)).toBe(true);

    onlineStatus.set(true);
    expect(get(disconnected)).toBe(false);
});

test('disconnected is true if either signal goes down (after first connect)', () => {
    DB.markFirebaseReachable();

    DB.markFirebaseDisconnected();
    onlineStatus.set(false);
    expect(get(disconnected)).toBe(true);

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
    // Speculative reachable=false alone is gated by a prior success, so no banner.
    expect(get(disconnected)).toBe(false);
    expect(get(firebaseFailed)).toBe(false);

    // Recover before the confirmation window elapses.
    vi.advanceTimersByTime(2_000);
    DB.markFirebaseReachable();

    // Past the original deadline, the cancelled timer must not fire.
    vi.advanceTimersByTime(5_000);
    expect(get(firebaseFailed)).toBe(false);
    expect(get(disconnected)).toBe(false);
});

test('a failure that persists past the window shows the banner', () => {
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    expect(get(disconnected)).toBe(false);

    // No recovering success — the definitive failure surfaces after the window.
    vi.advanceTimersByTime(4_000);
    expect(get(firebaseFailed)).toBe(true);
    expect(get(disconnected)).toBe(true);
});

test('repeated failures do not reset the confirmation window', () => {
    vi.useFakeTimers();

    DB.markFirebaseFailed();
    // A second failure partway through must keep the original deadline, not
    // restart it — otherwise a stream of listener errors could defer forever.
    vi.advanceTimersByTime(3_000);
    DB.markFirebaseFailed();
    expect(get(firebaseFailed)).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(get(firebaseFailed)).toBe(true);
});

test('banner is fully suppressed before authAttempted, even when offline', () => {
    // Mirrors the page-reload flash: navigator.onLine can briefly report false
    // during reload, but Firebase Auth hasn't resolved yet. Suppress entirely.
    authAttempted.set(false);
    onlineStatus.set(false);
    expect(get(disconnected)).toBe(false);

    DB.markFirebaseReachable();
    DB.markFirebaseDisconnected();
    expect(get(disconnected)).toBe(false);

    authAttempted.set(true);
    expect(get(disconnected)).toBe(true);
});
