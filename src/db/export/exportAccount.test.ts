import { must } from '@util/nullable';
import type { User } from 'firebase/auth';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ExportStep } from './AccountSnapshot';
import type { ReadmeText } from './readme';

/** Flipped per test, so the same module can answer both ways without the
 *  latched, once-per-page-load answer the real one gives. */
let proxying = false;
vi.mock('@db/proxySession', () => ({
    isProxySession: () => proxying,
    proxyPrefix: () => '',
}));

/** Counts every read the export attempts, which is how the proxy test proves
 *  the refusal happens *before* anything is read rather than after. */
const reads = { docs: 0, doc: 0 };

/** Whichever collections should fail this test, by name. */
let failing = new Set<string>();

vi.mock('firebase/firestore', () => ({
    collection: (_store: unknown, name: string) => ({ name }),
    doc: (_store: unknown, name: string, id: string) => ({ name, id }),
    query: (source: { name: string }) => source,
    where: (field: string, op: string, value: unknown) => ({
        field,
        op,
        value,
    }),
    getDocs: async (q: { name: string }) => {
        reads.docs++;
        if (failing.has(q.name)) throw new Error(`no reading ${q.name}`);
        return { docs: [] };
    },
    getDoc: async (ref: { name: string }) => {
        reads.doc++;
        if (failing.has(ref.name)) throw new Error(`no reading ${ref.name}`);
        return { exists: () => false, data: () => undefined };
    },
}));

vi.mock('@db/firebase', () => ({ firestore: { fake: true } }));

vi.mock('@db/Database', () => ({
    DB: {
        // The real one races a timeout and feeds the reachability banner;
        // here it only has to pass the promise through.
        read: <T>(promise: Promise<T>) => promise,
        Settings: { settings: {} },
        localDB: { getDirty: async () => [] },
    },
}));

vi.mock('@db/locales/LocalizationDexie', () => ({
    allLocaleEdits: async () => [],
}));

vi.mock('@db/creators/handle.svelte', () => ({
    HandleCollection: 'handles',
    getUsername: () => 'amy',
}));

vi.mock('@db/creators/CreatorDatabase', () => ({
    CreatorCollection: 'creators',
    Creator: { isUsername: () => true },
}));

vi.mock('@db/creators/strikes.svelte', () => ({
    StrikesCollection: 'strikes',
}));

vi.mock('@db/moderation/Notice', () => ({ NoticesCollection: 'notices' }));

import exportAccount from './exportAccount';

const text: ReadmeText = {
    title: 'title',
    intro: 'intro',
    contents: 'contents',
    contentsFiles: 'contentsFiles',
    contentsAccount: 'contentsAccount',
    relationships: 'relationships',
    relationshipsWords: 'relationshipsWords',
    device: 'device',
    formats: 'formats',
    excluded: 'excluded',
    privacy: 'privacy',
    missing: 'missing',
    manifest: 'manifest',
    kinds: {
        account: 'account',
        projects: 'projects',
        galleries: 'galleries',
        characters: 'characters',
        howtos: 'howtos',
        chats: 'chats',
        kits: 'kits',
        classes: 'classes',
        feedback: 'feedback',
        device: 'device',
    },
};

/** Only the parts of a signed-in creator this module reads. */
function creator(): User {
    const user = {
        uid: 'u1',
        email: 'amy@u.wordplay.dev',
        displayName: '😀',
        emailVerified: false,
        providerData: [{ providerId: 'password' }],
        metadata: {
            creationTime: 'Mon, 01 Jan 2026 00:00:00 GMT',
            lastSignInTime: 'Mon, 15 Sep 2026 00:00:00 GMT',
        },
        getIdTokenResult: async () => ({ claims: { teacher: true } }),
    };
    // A structural stand-in for the fifty fields of a Firebase user this module
    // never touches. Narrowed through a guard rather than cast, since a cast is
    // a fixture agreeing with itself.
    return must(isUser(user) ? user : undefined, 'a signed-in creator');
}

function isUser(value: unknown): value is User {
    return typeof value === 'object' && value !== null && 'uid' in value;
}

function steps(): { seen: ExportStep[]; progress: (s: ExportStep) => void } {
    const seen: ExportStep[] = [];
    return { seen, progress: (step: ExportStep) => seen.push(step) };
}

beforeEach(() => {
    proxying = false;
    failing = new Set();
    reads.docs = 0;
    reads.doc = 0;
});

describe('exportAccount', () => {
    test('refuses a read-only session before reading anything', async () => {
        // An administrator looking at someone else's account holds a real token
        // for them, so every read below would be allowed by the security rules.
        // That is exactly why the refusal has to happen here, and why it has to
        // happen first: helping with an account is not taking a copy of it.
        proxying = true;
        const { progress } = steps();
        expect(await exportAccount(creator(), text, progress)).toEqual({
            kind: 'refused',
        });
        expect(reads.docs).toBe(0);
        expect(reads.doc).toBe(0);
    });

    test('exports an empty account', async () => {
        const { seen, progress } = steps();
        const result = await exportAccount(creator(), text, progress);
        expect(result.kind).toBe('exported');
        if (result.kind !== 'exported') return;
        expect(result.gaps).toEqual([]);
        expect(result.count).toBe(0);
        expect(result.name).toMatch(/^wordplay-amy-\d{4}-\d{2}-\d{2}\.zip$/);
        expect(result.bytes.length).toBeGreaterThan(0);
        expect(seen).toEqual([
            'account',
            'projects',
            'galleries',
            'characters',
            'howtos',
            'chats',
            'kits',
            'classes',
            'feedback',
            'device',
            'archive',
            'saving',
        ]);
    });

    test('records a collection it could not read and keeps going', async () => {
        // A creator whose galleries happen to fail should still receive their
        // projects and everything else. All or nothing hands them nothing.
        failing = new Set(['galleries']);
        const { seen, progress } = steps();
        const result = await exportAccount(creator(), text, progress);
        expect(result.kind).toBe('exported');
        if (result.kind !== 'exported') return;
        expect(result.gaps).toEqual([
            { collection: 'galleries', reason: 'no reading galleries' },
        ]);
        // Every later step still ran.
        expect(seen).toContain('saving');
    });

    test('reads every collection a creator has a stake in', async () => {
        const { progress } = steps();
        await exportAccount(creator(), text, progress);
        // Four project queries, two galleries, two characters, two how-tos,
        // one chat, one kit, one kit version, two classes, one feedback.
        expect(reads.docs).toBe(16);
        // The five documents keyed by the creator's own uid.
        expect(reads.doc).toBe(5);
    });
});
