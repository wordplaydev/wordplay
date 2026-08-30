import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

import { Chats } from '@db/Database';
import Project from '@db/projects/Project';

/**
 * Who can see a project's chat is not who can see the project: a viewer can
 * read the code and not the conversation about it. The collaborate tile shows
 * this set while a message is being written, so it has to be exactly right —
 * and it is the rule `addChat` and `syncParticipants` already use.
 */

const Owner = 'owner-uid';
const Person = 'person-uid';

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

describe('Chats.getEligibleParticipants', () => {
    test('the owner can always see it', () => {
        expect([
            ...Chats.getEligibleParticipants(makeProject(), undefined),
        ]).toEqual([Owner]);
    });

    test('a collaborator and a commenter can', () => {
        for (const privilege of ['collaborate', 'comment'] as const) {
            const project = makeProject().withPrivilegeFor(Person, privilege);
            expect([
                ...Chats.getEligibleParticipants(project, undefined),
            ]).toContain(Person);
        }
    });

    test('a viewer cannot — they see the project, not the conversation', () => {
        const project = makeProject().withPrivilegeFor(Person, 'view');
        expect([
            ...Chats.getEligibleParticipants(project, undefined),
        ]).not.toContain(Person);
    });

    test('demoting a collaborator to a viewer takes their access away', () => {
        const project = makeProject()
            .withPrivilegeFor(Person, 'collaborate')
            .withPrivilegeFor(Person, 'view');
        expect([
            ...Chats.getEligibleParticipants(project, undefined),
        ]).not.toContain(Person);
    });
});
