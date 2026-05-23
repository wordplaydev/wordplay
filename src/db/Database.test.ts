import { get } from 'svelte/store';
import { beforeEach, expect, test } from 'vitest';
import {
    DB,
    SaveStatus,
    authAttempted,
    disconnected,
    firebaseEverConnected,
    firebaseReachable,
    onlineStatus,
    status,
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
    authAttempted.set(true);
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
