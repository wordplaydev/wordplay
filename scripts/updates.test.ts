import { describe, expect, test } from 'vitest';
import { bundleTexts } from '@locale/UpdatesBundle';
import {
    BundleFormat,
    parseChangelog,
    parseEntry,
    toBundle,
    toMarkup,
    textId,
} from './updates';

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

    test('extracts non-pictographic symbol markers (› and ¶)', () => {
        expect(parseEntry('› You can now fold code (#806).')).toEqual({
            text: 'You can now fold code (#806).',
            emoji: '›',
        });
        expect(parseEntry('¶ We fixed the cursor in blocks.')).toEqual({
            text: 'We fixed the cursor in blocks.',
            emoji: '¶',
        });
    });

    test('extracts a non-Latin letter used as a marker (요)', () => {
        expect(parseEntry('요 We fixed Korean text entry (#1054).')).toEqual({
            text: 'We fixed Korean text entry (#1054).',
            emoji: '요',
        });
    });

    test('leaves plain text alone', () => {
        expect(
            parseEntry('We added a back-to-top button on long pages.'),
        ).toEqual({
            text: 'We added a back-to-top button on long pages.',
            emoji: null,
        });
    });

    test('does not treat a leading ASCII word as a marker', () => {
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

    test('tolerates mistyped single-hash section headings', () => {
        const md = [
            '## 0.22.0 - 2026-06-06',
            '',
            'Intro.',
            '',
            '# Added',
            '',
            '- 🖱️ A palette.',
            '',
            '# Fixed',
            '',
            '- 요 Korean text entry.',
        ].join('\n');
        const [update] = parseChangelog(md);
        expect(update.summary).toBe('Intro.');
        expect(update.changes.added).toHaveLength(1);
        expect(update.changes.fixed).toHaveLength(1);
        expect(update.changes.fixed[0].emoji).toBe('요');
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

describe('toMarkup', () => {
    test('converts emphasis and issue references', () => {
        expect(toMarkup('We made it **bold** and _slanted_. (#398)')).toBe(
            'We made it *bold* and /slanted/. (<398@https://github.com/wordplaydev/wordplay/issues/398>)',
        );
    });

    test('leaves a code span untouched and wraps it as an example', () => {
        // `en_us` must round-trip: the prose transforms would turn its `_` into
        // an italic marker.
        expect(toMarkup('Set the locale to `en_us` today.')).toBe(
            'Set the locale to \\en_us\\ today.',
        );
    });

    test('escapes a slash in prose but not in a link target', () => {
        // Escaping `/` before the link substitution shipped every Markdown link
        // as `https:////wordplay.dev//about`.
        expect(
            toMarkup(
                'Read a/b on the [About](https://wordplay.dev/about) page.',
            ),
        ).toBe('Read a//b on the <About@https://wordplay.dev/about> page.');
    });

    test('does not turn a URL fragment into an issue link', () => {
        expect(toMarkup('See [notes](https://x.dev/p#12).')).toBe(
            'See <notes@https://x.dev/p#12>.',
        );
    });
});

describe('textId', () => {
    test('is stable for the same text and different for different text', () => {
        expect(textId('We fixed a bug.')).toBe(textId('We fixed a bug.'));
        expect(textId('We fixed a bug.')).not.toBe(textId('We fixed a typo.'));
    });

    test('never begins with a digit', () => {
        // `parseOverrideKey` reads a trailing all-digit segment of an override
        // key as an array index, so an all-digit id would be discarded silently.
        for (const text of ['a', 'b', 'c', 'We added a thing.', '🌐 x'])
            expect(textId(text)).toMatch(/^e[0-9a-f]{12}$/);
    });
});

describe('toBundle', () => {
    const md = [
        '## 0.18.1 - 2026-05-23',
        '',
        'This week we focused on the editor.',
        '',
        '### Added',
        '',
        '- 🔠 We added a `Phrase`. (#12)',
        '',
        '### Fixed',
        '',
        '- 🐛 We fixed a bug.',
    ].join('\n');

    test('carries the format version and one id per text', () => {
        const bundle = toBundle(parseChangelog(md));
        expect(bundle.format).toBe(BundleFormat);
        const [update] = bundle.updates;
        expect(update.summary?.id).toBe(
            textId('This week we focused on the editor.'),
        );
        expect(update.changes.added[0].id).toBe(
            textId('We added a `Phrase`. (#12)'),
        );
    });

    test('keeps the emoji structural and converts the text to markup', () => {
        const [update] = toBundle(parseChangelog(md)).updates;
        expect(update.changes.added[0].emoji).toBe('🔠');
        expect(update.changes.added[0].markup).toContain('\\Phrase\\');
    });

    test('represents an absent summary as null', () => {
        const [update] = toBundle(parseChangelog(md)).updates;
        expect(update.summaries.added).toBe(null);
        expect(update.summaries.fixed).toBe(null);
    });

    test('bundleTexts collects every translatable id exactly once', () => {
        const bundle = toBundle(parseChangelog(md));
        const texts = bundleTexts(bundle);
        expect(texts.size).toBe(3); // summary + two bullets
        expect(texts.get(textId('We fixed a bug.'))).toBe('We fixed a bug.');
    });
});
