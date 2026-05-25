import { describe, expect, test } from 'vitest';
import {
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
            caret: 0,
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
