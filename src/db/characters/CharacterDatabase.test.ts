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
            Projects: {
                allEditableProjects: [],
                reviseProject: vi.fn(),
            },
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
            mockDatabase.Projects.allEditableProjects = [mockProject];

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
