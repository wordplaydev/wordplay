import ConceptLink from '@nodes/ConceptLink';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from './Character';
import { CharactersDatabase } from './CharacterDatabase.svelte';

// Without this mock, we get a "TypeError: CharactersDatabase is not a constructor" error
vi.mock('../Database', () => ({}));

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

            const oldConceptLink = ConceptLink.make(
                oldCharacter.name,
            )

            const mockProject = {
                getSources: vi.fn(() => [{
                    nodes: vi.fn(() => [
                        oldConceptLink,
                    ]),
                }]),
                withRevisedNodes: vi.fn(),
            };

            // Mock the Projects.allEditableProjects to return our mock project
            mockDatabase.Projects.allEditableProjects = [mockProject];

            // Set up existing character
            charactersDb.byID.set('char1', oldCharacter);
            charactersDb.byName.set('user/OldName', oldCharacter);

            await charactersDb.updateCharacter(newCharacter, false);

            expect(charactersDb.byID.get('char1')).toEqual(newCharacter);
            expect(charactersDb.byName.get('user/NewName')).toEqual(newCharacter);
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
});