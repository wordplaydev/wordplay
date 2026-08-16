import { afterEach, expect, test, vi } from 'vitest';

// Stub the Firestore module: no real Firestore in unit tests. setDoc is the
// publish path under test; onSnapshot is a no-op subscription.
const { setDocMock } = vi.hoisted(() => ({
    setDocMock: vi.fn<() => Promise<void>>(async () => undefined),
}));
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({ id: 'mock-collection' })),
    doc: vi.fn(() => ({ id: 'mock-doc' })),
    onSnapshot: vi.fn(() => () => undefined),
    setDoc: setDocMock,
    deleteDoc: vi.fn(async () => undefined),
}));

// The tracker only needs the cap constant; the real Project module drags in
// the whole node graph.
vi.mock('@db/projects/Project', () => ({ MAX_CONCURRENT_EDITORS: 4 }));

import { PRESENCE_HEARTBEAT_MS } from '@db/projects/ProjectPresence';
import { FirebaseError } from 'firebase/app';
import { PresenceTracker } from './PresenceTracker.svelte';

const fakeDb = {} as never;

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setDocMock.mockReset();
    setDocMock.mockImplementation(async () => undefined);
});

test('a permission-denied publish latches: no heartbeat retries, no caret publishes', async () => {
    // The teacher-scale bug: a curator whose presence writes the rules denied
    // retried the denied setDoc every heartbeat for as long as the project
    // stayed open. A denial is terminal for the session, so one attempt is
    // the correct total.
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setDocMock.mockRejectedValue(
        new FirebaseError('permission-denied', 'denied'),
    );

    const tracker = new PresenceTracker(
        fakeDb,
        'project-1',
        'client-1',
        () => 'user-1',
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);

    // Heartbeats stop retrying...
    await vi.advanceTimersByTimeAsync(PRESENCE_HEARTBEAT_MS * 5);
    expect(setDocMock).toHaveBeenCalledTimes(1);

    // ...and caret updates no longer schedule publishes either.
    tracker.updateCaret(0, null);
    await vi.advanceTimersByTimeAsync(PRESENCE_HEARTBEAT_MS);
    expect(setDocMock).toHaveBeenCalledTimes(1);

    await tracker.stop();
});

test('a transient error does not latch: the next heartbeat retries', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setDocMock
        .mockRejectedValueOnce(new FirebaseError('unavailable', 'down'))
        .mockImplementation(async () => undefined);

    const tracker = new PresenceTracker(
        fakeDb,
        'project-2',
        'client-1',
        () => 'user-1',
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(setDocMock).toHaveBeenCalledTimes(1);

    // The heartbeat retries after a transient failure and succeeds.
    await vi.advanceTimersByTimeAsync(PRESENCE_HEARTBEAT_MS);
    expect(setDocMock).toHaveBeenCalledTimes(2);

    await tracker.stop();
});
