import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

/**
 * The daily translation budget is enforced on the server and displayed on the
 * client, and the two numbers have to agree or the meter lies. They can't share
 * a constant: `shared-types` is consumed type-only by the app, so it can carry
 * the shape of a budget but not its value. This test does what the repo's other
 * generated-artifact sync tests do — read both sources and compare — so a
 * change to one fails until the other follows.
 */
function constantIn(path: string): number {
    const source = readFileSync(path, 'utf8');
    const match = source.match(
        /export const DAILY_TRANSLATION_CHARACTERS = ([\d_]+);/,
    );
    expect(match, `no DAILY_TRANSLATION_CHARACTERS in ${path}`).not.toBeNull();
    return Number(match?.[1]?.replaceAll('_', ''));
}

describe('translation budget', () => {
    it('the client mirrors the server limit', () => {
        expect(constantIn('src/db/translationBudget.svelte.ts')).toBe(
            constantIn('functions/src/translationBudget.ts'),
        );
    });
});
