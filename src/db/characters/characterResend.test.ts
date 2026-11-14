import { beforeEach, expect, test, vi } from 'vitest';
import type { Character } from '#db/characters/Character.ts';
import { CharactersDatabase } from '#db/characters/CharacterDatabase.svelte.ts';
import { setDoc } from 'firebase/firestore';

// A cloud to write to, which the main character tests deliberately lack.
vi.mock('#db/firebase.ts', () => ({ firestore: {} }));
vi.mock('firebase/firestore', async (original) => ({
    ...(await original<typeof import('firebase/firestore')>()),
    doc: vi.fn((_: unknown, __: string, id: string) => ({ id })),
    setDoc: vi.fn(async () => undefined),
}));
vi.mock('../Database', () => ({
    SaveFailureReason: {
        IndexedDBWriteFailed: 'indexed-db-write-failed',
        IndexedDBUnsupported: 'indexed-db-unsupported',
        FirestoreBatchFailed: 'firestore-batch-failed',
        CloudWriteRefused: 'cloud-write-refused',
        ProjectContainsPII: 'project-contains-pii',
    },
    SaveStatus: { Saved: 'saved', Saving: 'saving', Error: 'error' },
}));

function character(id: string, updated: number): Character {
    return {
        id,
        owner: 'user',
        public: true,
        collaborators: [],
        updated,
        name: `user/${id}`,
        description: '',
        shapes: [],
    };
}

/** The parts of `Database` a save reaches for. */
type DatabaseFake = {
    getUser: () => { uid: string };
    setStatus: (...args: unknown[]) => void;
    reportBanner: (...args: unknown[]) => void;
    track: (write: Promise<unknown>) => Promise<unknown>;
    loadProjects: () => Promise<unknown>;
};

function database(
    loadProjects: DatabaseFake['loadProjects'] = async () => ({
        allEditableProjects: [],
    }),
): CharactersDatabase {
    const fake: DatabaseFake = {
        getUser: () => ({ uid: 'user' }),
        setStatus: vi.fn(),
        reportBanner: vi.fn(),
        track: (write) => write,
        loadProjects,
    };
    // @ts-expect-error The fake implements only what this database calls.
    return new CharactersDatabase(fake);
}

let db: CharactersDatabase;
beforeEach(() => {
    vi.clearAllMocks();
    db = database();
});

/** The ids of the characters sent to the cloud so far. */
function sent(): string[] {
    return vi
        .mocked(setDoc)
        .mock.calls.map(([reference]) =>
            typeof reference === 'object' && 'id' in reference
                ? String(reference.id)
                : '',
        );
}

test('a saved character is not sent again with the next one', async () => {
    // Every character edited in a session stayed in the list to send, so
    // saving one re-sent the others as they stood when last edited here: over
    // a collaborator's newer drawing, and over a share made since.
    await db.updateCharacter(character('a', 1), true);
    await db.persistUnsavedCharacters();
    expect(sent()).toEqual(['a']);

    await db.updateCharacter(character('b', 2), true);
    await db.persistUnsavedCharacters();
    expect(sent()).toEqual(['a', 'b']);
});

test('a drawing edit does not rewrite the projects that use the character', async () => {
    // Only a rename has projects to rewrite. Rewriting on every stroke meant
    // one project that could not be saved kept the drawing from saving.
    const loadProjects = vi.fn(async () => ({ allEditableProjects: [] }));
    const drawing = database(loadProjects);
    await drawing.updateCharacter(character('a', 1), true);
    await drawing.updateCharacter(
        { ...character('a', 2), description: 'changed' },
        true,
    );
    expect(loadProjects).not.toHaveBeenCalled();
});
