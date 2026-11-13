import { describe, expect, it } from 'vitest';
import isListedFor, { type ListableProject } from '#db/projects/isListedFor.ts';

function project(
    owner: string | null,
    collaborators: string[] = [],
    archived = false,
): ListableProject {
    return {
        isArchived: () => archived,
        getOwner: () => owner,
        isOwner: (uid) => uid === owner,
        hasCollaborator: (uid) => collaborators.includes(uid),
    };
}

describe('isListedFor', () => {
    it("lists a creator's own and collaborative projects", () => {
        expect(isListedFor(project('michael'), 'michael')).toBe(true);
        expect(isListedFor(project('soren', ['michael']), 'michael')).toBe(
            true,
        );
    });

    it("never lists a classmate's or teacher's project held locally", () => {
        // A shared Chromebook's cache, or a curator's gallery projects.
        expect(isListedFor(project('soren'), 'michael')).toBe(false);
        expect(isListedFor(project('teacher', ['angela']), 'michael')).toBe(
            false,
        );
    });

    it('lists projects made signed out, and everything when no account is on record', () => {
        expect(isListedFor(project(null), 'michael')).toBe(true);
        expect(isListedFor(project('soren'), null)).toBe(true);
    });

    it('never lists an archived project', () => {
        expect(isListedFor(project('michael', [], true), 'michael')).toBe(
            false,
        );
    });
});
