import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

import Project from '@db/projects/Project';

const Owner = 'owner-uid';
const Collaborator = 'collaborator-uid';
const Other = 'other-uid';

function makeProject(): Project {
    return Project.make(
        'project-1',
        'shared project',
        new Source('main', 'a'),
        [],
        DefaultLocale,
        Owner,
        [Collaborator, Other],
    );
}

describe('Project.withOwnerTransferredTo — #189', () => {
    test('the collaborator becomes the owner', () => {
        expect(
            makeProject().withOwnerTransferredTo(Collaborator).getOwner(),
        ).toBe(Collaborator);
    });

    test('the new owner leaves the collaborator list', () => {
        // The owner isn't their own collaborator anywhere else in the model,
        // and getContributors would otherwise count them twice.
        const transferred = makeProject().withOwnerTransferredTo(Collaborator);
        expect(transferred.getCollaborators()).not.toContain(Collaborator);
        expect(transferred.getContributors()).toHaveLength(3);
    });

    test('the former owner becomes a collaborator, keeping edit access', () => {
        // Firestore grants project edit access to the owner and collaborators
        // only, so without this the person who made the project is locked out
        // of it the moment they hand it over.
        const transferred = makeProject().withOwnerTransferredTo(Collaborator);
        expect(transferred.getCollaborators()).toContain(Owner);
        expect(transferred.hasContributor(Owner)).toBe(true);
    });

    test('other collaborators are left alone', () => {
        expect(
            makeProject()
                .withOwnerTransferredTo(Collaborator)
                .getCollaborators(),
        ).toContain(Other);
    });

    test('transferring to the current owner changes nothing', () => {
        // The control renders from a list of collaborators; a stale render
        // must not be able to empty that list.
        const project = makeProject();
        const transferred = project.withOwnerTransferredTo(Owner);
        expect(transferred.getOwner()).toBe(Owner);
        expect(transferred.getCollaborators()).toEqual([Collaborator, Other]);
    });

    test('transferring twice hands the project on rather than accumulating owners', () => {
        const twice = makeProject()
            .withOwnerTransferredTo(Collaborator)
            .withOwnerTransferredTo(Other);
        expect(twice.getOwner()).toBe(Other);
        expect(twice.getCollaborators().sort()).toEqual(
            [Owner, Collaborator].sort(),
        );
    });

    test('a project with no owner can still be claimed', () => {
        const unowned = Project.make(
            'project-2',
            'unowned',
            new Source('main', 'a'),
            [],
            DefaultLocale,
            null,
            [Collaborator],
        );
        const claimed = unowned.withOwnerTransferredTo(Collaborator);
        expect(claimed.getOwner()).toBe(Collaborator);
        expect(claimed.getCollaborators()).toEqual([]);
    });

    test('the transfer is a revision, so it merges like other stamped metadata', () => {
        const base = makeProject();
        const transferred = base
            .withOwnerTransferredTo(Collaborator)
            .bumpStampsFrom(base, 'deviceA');
        expect(transferred.getStamps().fields['owner']?.w).toBe('deviceA');
        expect(transferred.getStamps().fields['collaborators']?.w).toBe(
            'deviceA',
        );
    });
});
