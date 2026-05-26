import { describe, expect, test, vi, beforeEach } from 'vitest';

// Stub the Firestore module. We don't run a real Firestore in unit tests,
// so we record the addDoc calls and supply a no-op onSnapshot. This lets
// us assert that the provider flushed queued updates before resolving
// stop() — the data-loss path the test is here to guard.
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({ id: 'mock-collection' })),
    addDoc: vi.fn(async () => ({ id: `doc-${Math.random()}` })),
    onSnapshot: vi.fn(() => () => undefined),
}));

// The provider only uses ProjectsCollection (a const string), so the
// real database file doesn't need to load. Stub it to avoid pulling in
// the full Svelte 5 runes runtime under vitest.
vi.mock('@db/projects/ProjectsDatabase.svelte', () => ({
    ProjectsCollection: 'projects',
}));

import { addDoc } from 'firebase/firestore';
import ProjectCRDT from './ProjectCRDT';
import YjsFirestoreProvider from './YjsFirestoreProvider';

const fakeDb = {} as never;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('YjsFirestoreProvider — data-loss prevention on stop', () => {
    test('flushes pending updates before resolving stop()', async () => {
        const crdt = ProjectCRDT.fromSources(['hello']);
        const provider = new YjsFirestoreProvider(
            fakeDb,
            'project-1',
            crdt,
            'writer-A',
        );

        // Apply a local edit — this queues an update inside the
        // provider's pendingUpdates buffer. Without the flush-on-stop
        // fix, calling stop() inside the 200ms debounce window would
        // drop this update on the floor.
        crdt.applyLocalEdit(0, 'hello', 'hello world', 'local');

        await provider.stop();

        // The queued update must have been written exactly once.
        expect(addDoc).toHaveBeenCalledTimes(1);
    });

    test('suppresses the final flush when paused (at-cap)', async () => {
        const crdt = ProjectCRDT.fromSources(['hello']);
        const provider = new YjsFirestoreProvider(
            fakeDb,
            'project-2',
            crdt,
            'writer-A',
        );

        // Simulate the local user waiting for a concurrent-editor
        // slot. While paused the provider must NOT publish local
        // edits — the at-cap design says their edits shouldn't
        // escape the local replica. Those edits are still preserved
        // by deactivateCRDT's snapshot-to-project-doc write; this
        // path just guards against leaking through the realtime
        // subcollection in violation of the cap.
        provider.setPaused(true);
        crdt.applyLocalEdit(0, 'hello', 'hello world', 'local');

        await provider.stop();

        expect(addDoc).not.toHaveBeenCalled();
    });

    test('stop() is idempotent', async () => {
        const crdt = ProjectCRDT.fromSources(['x']);
        const provider = new YjsFirestoreProvider(
            fakeDb,
            'project-3',
            crdt,
            'writer-A',
        );
        await provider.stop();
        await provider.stop();
        // Two stops, no edits — addDoc never called.
        expect(addDoc).not.toHaveBeenCalled();
    });

    test('post-stop edits are not published', async () => {
        const crdt = ProjectCRDT.fromSources(['x']);
        const provider = new YjsFirestoreProvider(
            fakeDb,
            'project-4',
            crdt,
            'writer-A',
        );
        await provider.stop();

        // After stop, even local edits shouldn't queue a publish.
        // (In normal flow ProjectsDatabase.deactivateCRDT destroys
        // the Y.Doc after stop, but defense-in-depth here matters
        // in case a stray update event slips in during teardown.)
        crdt.applyLocalEdit(0, 'x', 'xy', 'local');
        expect(addDoc).not.toHaveBeenCalled();
    });
});
