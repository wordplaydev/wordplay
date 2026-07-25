import { describe, expect, test } from 'vitest';

import isSweepable, { type SweepCandidate } from '@db/projects/isSweepable';

/**
 * The cross-listener sweep deletes a local project when no listener's snapshot
 * matches it, inferring that it was removed server-side. These pin the cases
 * where that inference is wrong and deleting would destroy the only copy of the
 * user's work.
 */

function candidate(overrides: Partial<SweepCandidate> = {}): SweepCandidate {
    // A project that has been saved to the cloud and has since vanished from
    // every listener — the one case the sweep exists to handle.
    return {
        persisted: true,
        matched: false,
        unsaved: false,
        editing: false,
        ...overrides,
    };
}

describe('isSweepable', () => {
    test('sweeps a saved, unmatched, idle project — the case it exists for', () => {
        expect(isSweepable(candidate())).toBe(true);
    });

    test('never sweeps a project some listener still matches', () => {
        expect(isSweepable(candidate({ matched: true }))).toBe(false);
    });

    test('never sweeps a project that was never persisted', () => {
        // Nothing was ever written to the cloud, so its absence from the query
        // results is expected and says nothing about a server-side delete.
        expect(isSweepable(candidate({ persisted: false }))).toBe(false);
    });

    test('never sweeps a project with unsaved edits', () => {
        // The edits may simply not have landed yet (offline, failed write, or
        // still in flight). Deleting here is unrecoverable data loss.
        expect(isSweepable(candidate({ unsaved: true }))).toBe(false);
    });

    test('never sweeps a project with a live editing session', () => {
        // Deleting destroys the Y.Doc, discarding edits not yet folded in.
        expect(isSweepable(candidate({ editing: true }))).toBe(false);
    });

    test('a single protective condition is enough to block a sweep', () => {
        for (const guard of ['unsaved', 'editing'] as const)
            expect(isSweepable(candidate({ [guard]: true }))).toBe(false);
    });

    test('unmatched alone never justifies deleting unsaved work', () => {
        expect(isSweepable(candidate({ unsaved: true, editing: true }))).toBe(
            false,
        );
    });
});
