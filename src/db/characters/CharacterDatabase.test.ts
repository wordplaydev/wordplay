import ConceptLink from '@nodes/ConceptLink';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '@db/characters/Character';
import { CharactersDatabase } from '@db/characters/CharacterDatabase.svelte';

// Without this mock, we get a "TypeError: CharactersDatabase is not a constructor" error.
// Provide the value exports CharacterDatabase imports (SaveFailureReason is used
// by trackSave; SaveStatus by persistUnsavedCharacters).
vi.mock('../Database', () => ({
    SaveFailureReason: {
        IndexedDBWriteFailed: 'indexed-db-write-failed',
        IndexedDBUnsupported: 'indexed-db-unsupported',
        FirestoreBatchFailed: 'firestore-batch-failed',
        ProjectContainsPII: 'project-contains-pii',
    },
    SaveStatus: {
        Saved: 'saved',
        Saving: 'saving',
        Error: 'error',
    },
}));

describe('CharactersDatabase', () => {
    let charactersDb: any;
    let mockDatabase: any;
    let mockUser: { uid: string };

    beforeEach(() => {
        vi.clearAllMocks();

        mockUser = { uid: 'user' };

        mockDatabase = {
            getUser: vi.fn(() => mockUser),
            setStatus: vi.fn(),
            reportBanner: vi.fn(),
            track: vi.fn((write) => write),
            // The projects database is loaded on demand now, so the fake
            // exposes it the same way Database does.
            projectsFake: {
                allEditableProjects: [] as unknown[],
                reviseProject: vi.fn(),
            },
            loadProjects: vi.fn(async () => mockDatabase.projectsFake),
        };

        charactersDb = new CharactersDatabase(mockDatabase);
    });

    describe('updateCharacter', () => {
        it('should handle character name changes and update projects', async () => {
            const oldCharacter: Character = {
                id: 'char1',
                owner: 'user',
                public: true,
                collaborators: [],
                updated: 1000,
                name: 'user/OldName',
                description: 'Old description',
                shapes: [],
            };

            const newCharacter: Character = {
                id: 'char1',
                owner: 'user',
                public: true,
                collaborators: [],
                updated: 2000,
                name: 'user/NewName',
                description: 'New description',
                shapes: [],
            };

            const oldConceptLink = ConceptLink.make(oldCharacter.name);

            const mockProject = {
                getSources: vi.fn(() => [
                    {
                        nodes: vi.fn(() => [oldConceptLink]),
                    },
                ]),
                withRevisedNodes: vi.fn(),
            };

            // Mock the Projects.allEditableProjects to return our mock project
            mockDatabase.projectsFake.allEditableProjects = [mockProject];

            // Set up existing character
            charactersDb.byID.set('char1', oldCharacter);
            charactersDb.byName.set('user/OldName', oldCharacter);

            await charactersDb.updateCharacter(newCharacter, false);

            expect(charactersDb.byID.get('char1')).toEqual(newCharacter);
            expect(charactersDb.byName.get('user/NewName')).toEqual(
                newCharacter,
            );
            expect(charactersDb.byName.get('user/OldName')).toBeUndefined();

            // Assert that the project would have been revised
            expect(mockProject.getSources).toHaveBeenCalled();
            expect(mockProject.withRevisedNodes).toHaveBeenCalledWith(
                // Array of revision tuples: [oldNode, newNode]
                expect.arrayContaining([
                    expect.arrayContaining([
                        expect.objectContaining({
                            concept: expect.objectContaining({
                                text: expect.objectContaining({
                                    text: `@${oldCharacter.name}`,
                                }),
                            }),
                        }),
                        expect.objectContaining({
                            concept: expect.objectContaining({
                                text: expect.objectContaining({
                                    text: `@${newCharacter.name}`,
                                }),
                            }),
                        }),
                    ]),
                ]),
            );
        });
    });

    describe('save state (unsavedIDs / saveErrors / saveCounts)', () => {
        const make = (): Character => ({
            id: 'c1',
            owner: 'user',
            public: true,
            collaborators: [],
            updated: 1,
            name: 'user/A',
            description: '',
            shapes: [],
        });

        it('clears unsaved and records no error when a write succeeds', async () => {
            const ok = await charactersDb.trackSave(
                'c1',
                'user/A',
                Promise.resolve(),
            );
            expect(ok).toBe(true);
            expect(charactersDb.unsavedIDs.has('c1')).toBe(false);
            expect(charactersDb.saveErrors).toHaveLength(0);
        });

        it('stays unsaved and records an error when a write fails', async () => {
            const ok = await charactersDb.trackSave(
                'c1',
                'user/A',
                Promise.reject(new Error('nope')),
            );
            expect(ok).toBe(false);
            expect(charactersDb.unsavedIDs.has('c1')).toBe(true);
            expect(charactersDb.saveErrors).toHaveLength(1);
            expect(charactersDb.saveErrors[0]).toMatchObject({
                id: 'c1',
                name: 'user/A',
            });
        });

        it('clears a prior error when a later write succeeds', async () => {
            await charactersDb.trackSave(
                'c1',
                'user/A',
                Promise.reject(new Error('nope')),
            );
            expect(charactersDb.saveErrors).toHaveLength(1);
            await charactersDb.trackSave('c1', 'user/A', Promise.resolve());
            expect(charactersDb.saveErrors).toHaveLength(0);
            expect(charactersDb.unsavedIDs.has('c1')).toBe(false);
        });

        it('counts device / cloud / unsaved', () => {
            charactersDb.byID.set('c1', make());
            expect(charactersDb.saveCounts).toEqual({
                device: 1,
                cloud: 1,
                unsaved: 0,
            });
            charactersDb.unsavedIDs.add('c1');
            expect(charactersDb.saveCounts).toEqual({
                device: 1,
                cloud: 0,
                unsaved: 1,
            });
        });
    });

    describe('durable dirty tracking (survives reload)', () => {
        it('persists the dirty flag on write start and clears it on success', async () => {
            charactersDb.IndexedDBSupported = true;
            const localDB = { markDirty: vi.fn(), markClean: vi.fn() };
            mockDatabase.localDB = localDB;

            const ok = await charactersDb.trackSave(
                'c1',
                'user/A',
                Promise.resolve(),
            );
            expect(ok).toBe(true);
            expect(localDB.markDirty).toHaveBeenCalledWith('characters', 'c1');
            expect(localDB.markClean).toHaveBeenCalledWith('characters', 'c1');
        });

        it('leaves the dirty flag set (no markClean) when the write fails', async () => {
            charactersDb.IndexedDBSupported = true;
            const localDB = { markDirty: vi.fn(), markClean: vi.fn() };
            mockDatabase.localDB = localDB;

            const ok = await charactersDb.trackSave(
                'c1',
                'user/A',
                Promise.reject(new Error('nope')),
            );
            expect(ok).toBe(false);
            expect(localDB.markDirty).toHaveBeenCalledWith('characters', 'c1');
            expect(localDB.markClean).not.toHaveBeenCalled();
            // Still in the in-memory unsaved set for replay.
            expect(charactersDb.unsavedIDs.has('c1')).toBe(true);
        });

        it('warns about full storage when the dirty-row write hits the quota', async () => {
            charactersDb.IndexedDBSupported = true;
            const localDB = {
                // The durable dirty row can't be written because the device is
                // out of space — the offline-replay net is compromised, so the
                // user must be told (it used to fail silently).
                markDirty: vi.fn(() =>
                    Promise.reject(
                        new DOMException('full', 'QuotaExceededError'),
                    ),
                ),
                markClean: vi.fn(() => Promise.resolve()),
            };
            mockDatabase.localDB = localDB;

            // The cloud write itself still succeeds; only the local dirty row failed.
            const ok = await charactersDb.trackSave(
                'c1',
                'user/A',
                Promise.resolve(),
            );

            expect(ok).toBe(true);
            expect(mockDatabase.reportBanner).toHaveBeenCalledTimes(1);
        });

        it('clears the durable dirty row when a dirty item is deleted (phantom-unsaved regression)', () => {
            charactersDb.IndexedDBSupported = true;
            const localDB = {
                markDirty: vi.fn(),
                markClean: vi.fn(),
                deleteCharacter: vi.fn(),
            };
            mockDatabase.localDB = localDB;

            // A character with a pending (dirty) edit.
            const character: Character = {
                id: 'c1',
                owner: 'user',
                public: true,
                collaborators: [],
                updated: 1,
                name: 'user/Doomed',
                description: '',
                shapes: [],
            };
            charactersDb.byID.set('c1', character);
            charactersDb.unsavedIDs.add('c1');

            charactersDb.deleteCharacterLocally(character);

            // Deleting drops the in-memory flag AND clears the durable dirty
            // row, so a deleted-while-dirty item can't re-seed unsavedIDs on
            // reload (the phantom that kept the save dialog/beforeunload firing).
            expect(charactersDb.unsavedIDs.has('c1')).toBe(false);
            expect(localDB.markClean).toHaveBeenCalledWith('characters', 'c1');
        });
    });

    describe('loadCharacterIntoMemory (local-cache hydration)', () => {
        const make = (updated: number, name: string): Character => ({
            id: 'char1',
            owner: 'user',
            public: true,
            collaborators: [],
            updated,
            name,
            description: '',
            shapes: [],
        });

        it('inserts a cached character into both indexes', () => {
            const character = make(1000, 'user/Cached');
            charactersDb.loadCharacterIntoMemory(character);
            expect(charactersDb.byID.get('char1')).toEqual(character);
            expect(charactersDb.byName.get('user/Cached')).toEqual(character);
        });

        it('does not clobber a newer in-memory copy with a stale cache read', () => {
            const fresh = make(2000, 'user/Fresh');
            charactersDb.byID.set('char1', fresh);
            charactersDb.byName.set('user/Fresh', fresh);

            // A stale row from the local cache should be ignored.
            charactersDb.loadCharacterIntoMemory(make(1000, 'user/Stale'));

            expect(charactersDb.byID.get('char1')).toEqual(fresh);
            expect(charactersDb.byName.get('user/Stale')).toBeUndefined();
        });

        it('replaces an older in-memory copy and drops its old name index', () => {
            const older = make(1000, 'user/Old');
            charactersDb.byID.set('char1', older);
            charactersDb.byName.set('user/Old', older);

            const newer = make(2000, 'user/New');
            charactersDb.loadCharacterIntoMemory(newer);

            expect(charactersDb.byID.get('char1')).toEqual(newer);
            expect(charactersDb.byName.get('user/New')).toEqual(newer);
            expect(charactersDb.byName.get('user/Old')).toBeUndefined();
        });
    });
});

/**
 * Owner-scoped, full-name character naming (the duplicate-name fix).
 *
 * Uniqueness that matters is a creator's own full `username/Name`, because
 * that is what `byName` and the `where('name','==',…)` lookup are keyed on.
 * The check this replaced compared bare names across every character the user
 * could *edit*, which includes ones they merely collaborate on.
 */
describe('getOwnedCharacterWithName', () => {
    let db: any;
    let user: { uid: string };

    function character(overrides: Partial<Character>): Character {
        return {
            id: 'c1',
            owner: 'user',
            public: false,
            collaborators: [],
            updated: 0,
            name: 'me/Dog',
            description: '',
            shapes: [],
            ...overrides,
        } as Character;
    }

    beforeEach(() => {
        user = { uid: 'user' };
        db = new CharactersDatabase({
            getUser: vi.fn(() => user),
            setStatus: vi.fn(),
            reportBanner: vi.fn(),
            track: vi.fn((write: unknown) => write),
            loadProjects: vi.fn(async () => ({
                allEditableProjects: [],
                reviseProject: vi.fn(),
            })),
        } as never);
    });

    it('finds another character of the creator’s own with the same full name', () => {
        db.byID.set('c1', character({ id: 'c1' }));
        expect(db.getOwnedCharacterWithName('me/Dog')?.id).toBe('c1');
    });

    it('ignores the character being edited, so renaming to your own name is fine', () => {
        db.byID.set('c1', character({ id: 'c1' }));
        expect(db.getOwnedCharacterWithName('me/Dog', 'c1')).toBeUndefined();
    });

    it('ignores a collaborated character that merely shares a bare name', () => {
        // The bug this replaced: collaborating on `bob/Dog` reported `Dog` as
        // taken, though `me/Dog` collides with nothing.
        db.byID.set(
            'c2',
            character({
                id: 'c2',
                owner: 'bob',
                collaborators: ['user'],
                name: 'bob/Dog',
            }),
        );
        expect(db.getOwnedCharacterWithName('me/Dog')).toBeUndefined();
    });

    it('ignores someone else’s character with the identical bare name', () => {
        db.byID.set(
            'c3',
            character({ id: 'c3', owner: 'someone', name: 'someone/Dog' }),
        );
        expect(db.getOwnedCharacterWithName('me/Dog')).toBeUndefined();
    });

    it('finds nothing when signed out', () => {
        db.byID.set('c1', character({ id: 'c1' }));
        db = new CharactersDatabase({
            getUser: vi.fn(() => null),
            setStatus: vi.fn(),
            reportBanner: vi.fn(),
            track: vi.fn((write: unknown) => write),
            loadProjects: vi.fn(async () => ({ allEditableProjects: [] })),
        } as never);
        expect(db.getOwnedCharacterWithName('me/Dog')).toBeUndefined();
    });
});

/** Gallery membership (#822). */
describe('getGalleryCharacters', () => {
    let db: any;

    function character(id: string, name: string, gallery: string | null) {
        return {
            id,
            owner: 'user',
            public: false,
            collaborators: [],
            updated: 0,
            name,
            description: '',
            shapes: [],
            ...(gallery === null ? {} : { gallery }),
        };
    }

    beforeEach(() => {
        db = new CharactersDatabase({
            getUser: vi.fn(() => ({ uid: 'user' })),
            setStatus: vi.fn(),
            reportBanner: vi.fn(),
            track: vi.fn((write: unknown) => write),
            loadProjects: vi.fn(async () => ({ allEditableProjects: [] })),
        } as never);
    });

    it('returns only the characters in that gallery, sorted by bare name', () => {
        db.byID.set('c1', character('c1', 'me/Zebra', 'g1'));
        db.byID.set('c2', character('c2', 'me/Apple', 'g1'));
        db.byID.set('c3', character('c3', 'me/Mango', 'g2'));
        db.byID.set('c4', character('c4', 'me/Nothing', null));

        expect(
            db.getGalleryCharacters('g1', ['en']).map((c: Character) => c.id),
        ).toEqual(['c2', 'c1']);
    });

    it('sorts by the bare name, not the username-qualified one', () => {
        // Sorting the full names would order by owner, which would cluster a
        // gallery by student rather than alphabetically.
        db.byID.set('c1', character('c1', 'zoe/Apple', 'g1'));
        db.byID.set('c2', character('c2', 'adam/Zebra', 'g1'));
        expect(
            db.getGalleryCharacters('g1', ['en']).map((c: Character) => c.id),
        ).toEqual(['c1', 'c2']);
    });
});

/**
 * The cross-listener sweep.
 *
 * A character that leaves one listener's query hasn't necessarily been deleted
 * — taking your own character out of a gallery drops it from that chunk's
 * listener while the base listener still holds it — so removal is decided
 * against the union of every listener. The trap is the other direction: a
 * character the cloud has never shown us is absent from every listener too,
 * and sweeping it throws away the only copy.
 *
 * That is not hypothetical. It shipped: a character created moments earlier
 * was swept out of `byID` in the window between its write being acknowledged
 * and the next snapshot carrying it, which made `updateCharacter`'s
 * `if (existingCharacter)` false and silently skipped the rename-rewrite that
 * updates `@username/Name` references across the creator's projects. The
 * character was renamed; every project pointing at it was left behind.
 */
describe('the sweep only deletes what the cloud has actually shown us', () => {
    let db: any;
    const user = { uid: 'user' };

    // Real uuids: CharacterSchema requires one, and a snapshot whose doc
    // fails to parse is skipped, which would make these tests pass for the
    // wrong reason.
    const ID = '3f7a1c9e-2b4d-4e8a-9c1f-6d5b0a2e7c31';

    function character(id: string, name: string) {
        return {
            id,
            owner: 'user',
            public: false,
            collaborators: [] as string[],
            updated: 1,
            name,
            description: '',
            shapes: [],
        };
    }

    /** A QuerySnapshot with just the parts handleSnapshot reads. */
    function snapshot(characters: unknown[], fromCache = false) {
        return {
            metadata: { fromCache },
            forEach(visit: (doc: { data: () => unknown }) => void) {
                for (const c of characters) visit({ data: () => c });
            },
        };
    }

    beforeEach(() => {
        db = new CharactersDatabase({
            getUser: vi.fn(() => user),
            setStatus: vi.fn(),
            reportBanner: vi.fn(),
            track: vi.fn((write: unknown) => write),
            markSynced: vi.fn(),
            Galleries: { accessibleGalleries: new Map() },
            loadProjects: vi.fn(async () => ({
                allEditableProjects: [],
                reviseProject: vi.fn(),
            })),
        } as never);
        // One listener (no galleries), so a single snapshot completes the set.
        db.expectedCharacterListeners = 1;
    });

    it('keeps a character the cloud has never carried', () => {
        // Exactly the just-created case: in memory, write acknowledged, but no
        // snapshot has included it yet.
        db.byID.set(ID, character(ID, 'me/New'));
        db.handleSnapshot('base', user, snapshot([]));
        expect(db.byID.has(ID)).toBe(true);
    });

    it('sweeps a character the cloud carried and then stopped carrying', () => {
        const c = character(ID, 'me/Gone');
        db.handleSnapshot('base', user, snapshot([c]));
        expect(db.byID.has(ID)).toBe(true);
        db.handleSnapshot('base', user, snapshot([]));
        expect(db.byID.has(ID)).toBe(false);
    });

    it('never sweeps on a snapshot served from the cache', () => {
        // A cached snapshot can predate a write that already landed, so its
        // absences are not evidence of anything.
        const c = character(ID, 'me/Cached');
        db.handleSnapshot('base', user, snapshot([c]));
        db.handleSnapshot('base', user, snapshot([], true));
        expect(db.byID.has(ID)).toBe(true);
    });

    it('waits for every listener before concluding anything', () => {
        const c = character(ID, 'me/Two');
        db.handleSnapshot('base', user, snapshot([c]));
        // Two listeners now, and only one has reported since.
        db.expectedCharacterListeners = 2;
        db.listenerCharacterIDs.clear();
        db.handleSnapshot('base', user, snapshot([]));
        expect(db.byID.has(ID)).toBe(true);
        // The second reports, also without it: now it's gone from all of them.
        db.handleSnapshot('gallery:0', user, snapshot([]));
        expect(db.byID.has(ID)).toBe(false);
    });
});
