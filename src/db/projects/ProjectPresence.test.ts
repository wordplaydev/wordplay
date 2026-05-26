import { describe, expect, test } from 'vitest';
import {
    assignDistinctColors,
    isPresenceStale,
    pickColorForClient,
    PRESENCE_STALE_MS,
    type PresencePayload,
} from './ProjectPresence';

describe('pickColorForClient', () => {
    test('returns a chromatic basic-color term', () => {
        const color = pickColorForClient('writer-a');
        expect(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown']).toContain(color);
    });
    test('is deterministic — same client always gets the same color', () => {
        const a1 = pickColorForClient('alice');
        const a2 = pickColorForClient('alice');
        expect(a1).toBe(a2);
    });
    test('different clients tend to get different colors', () => {
        // Among a handful of distinct IDs, expect at least 2 distinct colors —
        // we have 8 chromatic colors and the hash is well-distributed for
        // these inputs.
        const colors = new Set([
            pickColorForClient('alice'),
            pickColorForClient('bob'),
            pickColorForClient('carol'),
            pickColorForClient('dave'),
            pickColorForClient('eve'),
        ]);
        expect(colors.size).toBeGreaterThan(1);
    });
});

describe('isPresenceStale', () => {
    function payload(lastSeen: number): PresencePayload {
        return {
            clientID: 'x',
            userID: null,
            sourceIndex: 0,
            // The caret encoding is exercised by caretEncoding.test.ts;
            // here we only need a value the schema accepts.
            caret: null,
            color: 'red',
            lastSeen,
        };
    }
    test('fresh presence is not stale', () => {
        const now = 1_000_000;
        expect(isPresenceStale(payload(now - 1000), now)).toBe(false);
    });
    test('old presence is stale', () => {
        const now = 1_000_000;
        expect(isPresenceStale(payload(now - PRESENCE_STALE_MS - 100), now)).toBe(true);
    });
});

describe('assignDistinctColors', () => {
    test('every client in the input gets a color', () => {
        const colors = assignDistinctColors(['a', 'b', 'c', 'd']);
        expect(colors.size).toBe(4);
        for (const id of ['a', 'b', 'c', 'd'])
            expect(colors.has(id)).toBe(true);
    });

    test('within the palette cap, every assigned color is unique', () => {
        // The 4-concurrent-editor cap fits comfortably under the 8-color
        // chromatic palette, so no collisions should ever occur in
        // practice. Run a handful of distinct ID sets to confirm the
        // greedy fallback kicks in when preferences collide.
        const sets = [
            ['alice', 'bob', 'carol', 'dave'],
            ['1', '2', '3', '4'],
            ['session-aa', 'session-bb', 'session-cc', 'session-dd'],
            // Two IDs that happen to hash to the same preferred color
            // would reveal the conflict — assignDistinctColors must
            // still produce distinct outputs.
            ['xx', 'xy', 'xz', 'xw'],
        ];
        for (const ids of sets) {
            const colors = assignDistinctColors(ids);
            const distinct = new Set(colors.values());
            expect(distinct.size).toBe(ids.length);
        }
    });

    test('assignment is stable across viewers that see the same set', () => {
        // Order of input shouldn't matter — the function sorts
        // internally. Two viewers passing the same set in different
        // orders must arrive at the same assignment.
        const a = assignDistinctColors(['z', 'a', 'm']);
        const b = assignDistinctColors(['m', 'z', 'a']);
        expect(a.get('z')).toBe(b.get('z'));
        expect(a.get('a')).toBe(b.get('a'));
        expect(a.get('m')).toBe(b.get('m'));
    });

    test('a removed peer does not shift remaining peers colors', () => {
        // When a peer leaves, the remaining peers should keep the
        // same colors they had — no flicker.
        const before = assignDistinctColors(['a', 'b', 'c', 'd']);
        const after = assignDistinctColors(['a', 'b', 'c']);
        for (const id of ['a', 'b', 'c'])
            expect(after.get(id)).toBe(before.get(id));
    });

    test('honors hash-preferred color when no collision', () => {
        // A single client should always get its preferred color from
        // pickColorForClient. (No one else to collide with.)
        const id = 'alice';
        const colors = assignDistinctColors([id]);
        expect(colors.get(id)).toBe(pickColorForClient(id));
    });
});
