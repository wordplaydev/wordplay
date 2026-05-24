import { describe, expect, test } from 'vitest';
import { parseEntry } from './updates.js';

describe('parseEntry', () => {
    test('extracts simple emoji prefix', () => {
        expect(parseEntry('🌐 Now with support for Bengali (#142).')).toEqual({
            text: 'Now with support for Bengali (#142).',
            emoji: '🌐',
        });
    });

    test('extracts compound emoji prefix (VS16 sequence)', () => {
        // 🛠️ is a non-pictographic sequence (wrench + VS16); regex covers VS16 modifiers.
        const entry = parseEntry('🛠️ Upgraded internal tooling.');
        expect(entry.emoji).toBe('🛠️');
        expect(entry.text).toBe('Upgraded internal tooling.');
    });

    test('leaves plain text alone', () => {
        expect(
            parseEntry('We added a back-to-top button on long pages.'),
        ).toEqual({
            text: 'We added a back-to-top button on long pages.',
            emoji: null,
        });
    });

    test('does not treat a leading non-pictographic glyph as emoji', () => {
        expect(parseEntry('A new feature.')).toEqual({
            text: 'A new feature.',
            emoji: null,
        });
    });

    test('requires a space after the emoji', () => {
        // No space after emoji -> not treated as a prefix.
        const entry = parseEntry('🌐Bengali support');
        expect(entry.emoji).toBe(null);
        expect(entry.text).toBe('🌐Bengali support');
    });
});
