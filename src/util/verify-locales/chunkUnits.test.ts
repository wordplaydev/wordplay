import { describe, expect, test } from 'vitest';
import { chunkUnits } from './ClaudeTranslator';

/** Total characters in a chunk, the thing the budget bounds. */
const size = (chunk: string[]) =>
    chunk.reduce((total, unit) => total + unit.length, 0);

describe('chunkUnits', () => {
    test('fills up to the segment cap when the text is short', () => {
        const units = Array.from({ length: 60 }, () => 'short');
        const chunks = chunkUnits(units, 25, 4000);
        expect(chunks.map((c) => c.length)).toEqual([25, 25, 10]);
    });

    test('closes a chunk early when the characters run out', () => {
        // The gu-IN case: 25 long segments made one 8,000-character request
        // that blew the 600s timeout three times and lost the whole chunk.
        const units = Array.from({ length: 25 }, () => 'x'.repeat(320));
        const chunks = chunkUnits(units, 25, 4000);
        expect(chunks.length).toBeGreaterThan(1);
        for (const chunk of chunks)
            expect(size(chunk)).toBeLessThanOrEqual(4000);
    });

    test('a single unit over the budget goes alone rather than being dropped', () => {
        const huge = 'x'.repeat(9000);
        const chunks = chunkUnits(['a', huge, 'b'], 25, 4000);
        expect(chunks.some((c) => c.length === 1 && c[0] === huge)).toBe(true);
        expect(chunks.flat()).toEqual(['a', huge, 'b']);
    });

    test('never loses or reorders a unit', () => {
        const units = Array.from({ length: 137 }, (_, i) =>
            `${i}`.repeat(i % 40),
        );
        expect(chunkUnits(units, 25, 4000).flat()).toEqual(units);
    });

    test('no chunk is empty', () => {
        const units = Array.from({ length: 40 }, () => 'x'.repeat(5000));
        for (const chunk of chunkUnits(units, 25, 4000))
            expect(chunk.length).toBeGreaterThan(0);
    });

    test('an empty input produces no chunks', () => {
        expect(chunkUnits([], 25, 4000)).toEqual([]);
    });
});
