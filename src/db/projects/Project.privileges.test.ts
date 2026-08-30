import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

import Project from '@db/projects/Project';

/**
 * A person has exactly one privilege on a project, even though the three lists
 * that carry them are separate Firestore arrays. Before the collaborate tile's
 * privilege picker there was no way to say that: `withCollaborator` and
 * `withCommenter` were independent, so the same person could sit in all three
 * lists and render as three separate people.
 */

const Owner = 'owner-uid';
const Person = 'person-uid';
const Bystander = 'bystander-uid';

function makeProject(): Project {
    return Project.make(
        'project-1',
        'shared project',
        new Source('main', 'a'),
        [],
        DefaultLocale,
        Owner,
        [],
    );
}

describe('Project.withPrivilegeFor', () => {
    test('gives someone with nothing a privilege', () => {
        const project = makeProject().withPrivilegeFor(Person, 'comment');
        expect(project.getPrivilegeFor(Person)).toBe('comment');
        expect(project.getCommenters()).toContain(Person);
    });

    test('moves them between lists rather than adding to a second', () => {
        const project = makeProject()
            .withPrivilegeFor(Person, 'view')
            .withPrivilegeFor(Person, 'collaborate');
        expect(project.getCollaborators()).toContain(Person);
        expect(project.getViewers()).not.toContain(Person);
        expect(project.getCommenters()).not.toContain(Person);
    });

    test('undefined removes them from every list', () => {
        const project = makeProject()
            .withPrivilegeFor(Person, 'collaborate')
            .withPrivilegeFor(Person, undefined);
        expect(project.getPrivilegeFor(Person)).toBeUndefined();
        expect(project.getCollaborators()).not.toContain(Person);
        expect(project.getCommenters()).not.toContain(Person);
        expect(project.getViewers()).not.toContain(Person);
    });

    test('is a no-op when nothing would change', () => {
        const project = makeProject().withPrivilegeFor(Person, 'view');
        expect(project.withPrivilegeFor(Person, 'view')).toBe(project);
        expect(project.withPrivilegeFor(Bystander, undefined)).toBe(project);
    });

    test('leaves everyone else where they are', () => {
        const project = makeProject()
            .withCollaborator(Bystander)
            .withPrivilegeFor(Person, 'comment');
        expect(project.getCollaborators()).toEqual([Bystander]);
    });

    test('normalizes someone who is in several lists at once', () => {
        // Reachable in any project saved before this method existed, since
        // withCollaborator never removed anyone from commenters or viewers.
        const legacy = makeProject()
            .withCollaborator(Person)
            .withCommenter(Person)
            .withViewer(Person);
        expect(legacy.getPrivilegeFor(Person)).toBe('collaborate');

        // Choosing the privilege they already read as having still repairs it.
        const repaired = legacy.withPrivilegeFor(Person, 'collaborate');
        expect(repaired.getCollaborators()).toContain(Person);
        expect(repaired.getCommenters()).not.toContain(Person);
        expect(repaired.getViewers()).not.toContain(Person);
    });
});

describe('Project.getPrivilegeFor', () => {
    test('answers with the most powerful list someone is in', () => {
        const project = makeProject().withCommenter(Person).withViewer(Person);
        expect(project.getPrivilegeFor(Person)).toBe('comment');
    });

    test('says nothing about the owner, who is not their own collaborator', () => {
        expect(makeProject().getPrivilegeFor(Owner)).toBeUndefined();
    });
});

describe('Project.withOwnerTransferredTo clears every privilege', () => {
    test('a commenter promoted to owner is no longer a commenter', () => {
        // The transfer control used to be offered only on a collaborator; the
        // privilege picker offers it on any row, so this path is new.
        const project = makeProject()
            .withPrivilegeFor(Person, 'comment')
            .withOwnerTransferredTo(Person);
        expect(project.getOwner()).toBe(Person);
        expect(project.getCommenters()).not.toContain(Person);
        expect(project.getPrivilegeFor(Person)).toBeUndefined();
    });

    test('a viewer promoted to owner is no longer a viewer', () => {
        const project = makeProject()
            .withPrivilegeFor(Person, 'view')
            .withOwnerTransferredTo(Person);
        expect(project.getViewers()).not.toContain(Person);
    });

    test('the previous owner becomes a collaborator', () => {
        const project = makeProject()
            .withPrivilegeFor(Person, 'view')
            .withOwnerTransferredTo(Person);
        expect(project.getCollaborators()).toContain(Owner);
    });
});
