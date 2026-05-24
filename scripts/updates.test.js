import { describe, expect, test } from 'vitest';
import { parseChangelog, parseEntry } from './updates.js';

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

describe('parseChangelog', () => {
    test('captures a leading version-level summary', () => {
        const md = [
            '## 0.18.1 - 2026-05-23',
            '',
            'This week we focused on the editor.',
            '',
            '### Added',
            '',
            '- 🔠 A thing.',
        ].join('\n');
        const [update] = parseChangelog(md);
        expect(update.summary).toBe('This week we focused on the editor.');
        expect(update.changes.added).toHaveLength(1);
    });

    test('captures a trailing per-section summary', () => {
        const md = [
            '## 0.18.1 - 2026-05-23',
            '',
            '### Added',
            '',
            '- 🔠 A thing.',
            '',
            'Editor things got better.',
            '',
            '### Fixed',
            '',
            '- 🐛 A bug.',
        ].join('\n');
        const [update] = parseChangelog(md);
        expect(update.summaries.added).toBe('Editor things got better.');
        expect(update.changes.fixed).toHaveLength(1);
    });

    test('preserves blank lines as paragraph breaks within a summary', () => {
        const md = [
            '## 0.18.1 - 2026-05-23',
            '',
            'First paragraph.',
            '',
            'Second paragraph.',
            '',
            '### Added',
            '',
            '- 🔠 A thing.',
        ].join('\n');
        const [update] = parseChangelog(md);
        expect(update.summary).toBe('First paragraph.\n\nSecond paragraph.');
    });

    test('omits summaries when there is no prose', () => {
        const md = [
            '## 0.18.1 - 2026-05-23',
            '',
            '### Added',
            '',
            '- 🔠 A thing.',
        ].join('\n');
        const [update] = parseChangelog(md);
        expect(update.summary).toBe('');
        expect(update.summaries.added).toBe('');
    });

    test('attributes prose between two sections to the preceding section', () => {
        const md = [
            '## 0.18.1 - 2026-05-23',
            '',
            '### Added',
            '',
            '- 🔠 A.',
            '',
            'Belongs to Added.',
            '',
            '### Fixed',
            '',
            '- 🐛 B.',
        ].join('\n');
        const [update] = parseChangelog(md);
        expect(update.summaries.added).toBe('Belongs to Added.');
        expect(update.summaries.fixed).toBe('');
    });
});
