import getResponsibility from '@db/moderation/responsibility';
import { kitVisibility } from '@db/moderation/visibility';
import { expect, test } from 'vitest';
import { makeKit, type SerializedKit } from '@db/kits/Kit';

/**
 * Who reviews a reported kit (#8). Where a notice about one leads is in
 * `noticeLink.test.ts`, beside every other subject kind.
 *
 * A kit has no gallery, so its whole responsibility story is the public/private one —
 * which is worth pinning, because "nobody reviews this" and "the platform reviews this"
 * are the two answers, and getting the boundary wrong either buries reports or invites
 * them about things nobody else can see.
 */
function kit(fields: Partial<SerializedKit>): SerializedKit {
    // Through `makeKit`, so a field added to the schema arrives here at the value a real
    // kit starts with rather than one this file invented.
    return {
        ...makeKit('k1', 'amy', 'amy/colors', '', null),
        latest: 1,
        versionCount: 1,
        ...fields,
    };
}

test('nobody reviews a kit its creator has not shared', () => {
    // Nothing to ask about: a private kit is between a creator and themselves.
    expect(getResponsibility(kitVisibility(kit({ public: false })))).toEqual({
        kind: 'none',
    });
});

test('the platform reviews a shared kit', () => {
    // A kit has no gallery to route to, so a shared one is everyone's business, and
    // reviewing it is the platform's.
    expect(getResponsibility(kitVisibility(kit({ public: true })))).toEqual({
        kind: 'platform',
    });
});

test('a kit carries its owner, so a report can name an author', () => {
    expect(kitVisibility(kit({ owner: 'bo' })).owner).toBe('bo');
});
