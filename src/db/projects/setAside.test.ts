import { expect, test } from 'vitest';

import { planWipe } from '#db/projects/setAside.ts';

const rows = [
    { id: 'saved', owner: 'amy' },
    { id: 'unsaved', owner: 'amy' },
    { id: 'shared-unsaved', owner: 'teacher' },
    { id: 'signed-out', owner: null },
];

test('a wipe forgets only what the cloud already has', () => {
    const plan = planWipe(rows, new Set(['unsaved', 'shared-unsaved']), 'amy');
    // Unsaved work is held for whoever made the changes, whoever owns the
    // project: a collaborator's edits to a teacher's project are the
    // collaborator's to send.
    expect(plan.setAside.map((row) => row.id)).toEqual([
        'unsaved',
        'shared-unsaved',
    ]);
    expect(plan.kept.map((row) => row.id)).toEqual(['signed-out']);
    expect(plan.deleted.map((row) => row.id)).toEqual(['saved']);
});

test('every project is accounted for, and none twice', () => {
    const plan = planWipe(rows, new Set(['unsaved']), 'amy');
    expect(
        [...plan.setAside, ...plan.kept, ...plan.deleted]
            .map((row) => row.id)
            .sort(),
    ).toEqual(rows.map((row) => row.id).sort());
});

test('signing out holds nothing back', () => {
    // A sign-out names no holder: it is the request to leave nothing of an
    // account on this device, unsaved work included.
    const plan = planWipe(rows, new Set(['unsaved']), null);
    expect(plan.setAside).toEqual([]);
    expect(plan.deleted.map((row) => row.id)).toContain('unsaved');
});
