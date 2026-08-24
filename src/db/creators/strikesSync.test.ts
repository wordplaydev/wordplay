import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

import { StrikesUntilBanned } from '@db/creators/strikes.svelte';

/**
 * The client mirrors the server's strike limit so it can say "one more" before
 * a creator's record exists. Two copies of a number that a person reads as a
 * promise — "after three warnings" — must not drift, and only the server's is
 * enforced, so a stale client copy would quietly lie.
 *
 * The server constant is read as text rather than imported: functions/ is a
 * separate package with its own build, and importing it here would drag the
 * Admin SDK into the app's test run.
 */
describe('strike limit stays in sync with the server', () => {
    test('the client mirror matches functions/src/strikes.ts', () => {
        const source = readFileSync(
            path.join(process.cwd(), 'functions/src/strikes.ts'),
            'utf-8',
        );
        const match = source.match(
            /export const StrikesUntilBanned = (\d+)\s*;/,
        );
        expect(
            match,
            'StrikesUntilBanned not found in functions',
        ).not.toBeNull();
        expect(Number(match?.[1])).toBe(StrikesUntilBanned);
    });
});
