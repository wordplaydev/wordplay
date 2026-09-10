import { HowToIDs } from '@concepts/HowTo';
import getDocExamples from '@util/verify-locales/docExamples';
import analyzeCode from '@util/verify-locales/analyzeCode';
import DefaultLocale from '@locale/DefaultLocale';
import {
    bundleEntryToHowTo,
    howToToString,
    parseHowTo,
    type HowToBundleEntry,
} from '@concepts/HowTo';
import { MachineTranslated } from '@locale/Annotations';
import { isMachineTranslated, isUnwritten } from '@locale/LocaleText';
import {
    howToNeedsTranslation,
    localizedExampleIsSound,
    padLike,
} from '@util/verify-locales/verifyHowTo';
import Example from '@nodes/Example';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import parseDoc from '@parser/parseDoc';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { toMarkup } from '@parser/toMarkup';
import { toTokens } from '@parser/toTokens';
import { withoutColorSelector } from '@unicode/emoji';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Test the helper functions and logic that can be unit tested
describe('verifyHowTo helpers', () => {
    it('should identify unwritten content correctly', () => {
        expect(isUnwritten('$?Some unwritten text')).toBe(true);
        expect(isUnwritten('Regular text')).toBe(false);
        expect(isUnwritten('')).toBe(false);
    });

    it('should identify automated content correctly', () => {
        expect(
            isMachineTranslated(MachineTranslated + 'Some translated text'),
        ).toBe(true);
        expect(isMachineTranslated('Regular text')).toBe(false);
        expect(isMachineTranslated('')).toBe(false);
    });

    it('should handle machine translated marker correctly', () => {
        const text = 'Hello world';
        const marked = MachineTranslated + text;

        expect(marked.startsWith(MachineTranslated)).toBe(true);
        expect(marked.replace(MachineTranslated, '')).toBe(text);
    });

    it('should clean lines correctly', () => {
        const testCases = [
            {
                input: MachineTranslated + 'Some translated text',
                expected: 'Some translated text',
            },
            {
                input: '$~Some text with marker',
                expected: 'Some text with marker',
            },
            {
                input: '  Regular text with spaces  ',
                expected: 'Regular text with spaces',
            },
            {
                input: '',
                expected: '',
            },
        ];

        testCases.forEach(({ input, expected }) => {
            const cleaned = input
                .replace(MachineTranslated, '')
                .replace(/^\$~/, '')
                .trim();
            expect(cleaned).toBe(expected);
        });
    });
});

describe('how-to bundle round-trip', () => {
    // Rebuild a how-to from a bundle entry derived from its source .txt, mirroring how
    // buildHowTos.ts generates the bundle and LocalesDatabase.loadHowTos reads it back.
    const id = 'animate-phrase';
    const text = fs.readFileSync(
        path.join('static', 'locales', 'en-US', 'how', `${id}.txt`),
        'utf-8',
    );
    const { how, body } = parseHowTo(id, text);

    it('parses the source how-to', () => {
        expect(how).not.toBeNull();
        expect(how?.content.getExamples().length).toBeGreaterThan(0);
    });

    it('round-trips a bundle entry back to an equivalent how-to', () => {
        if (how === null || body === null)
            throw new Error('how-to failed to parse');

        // Build a bundle entry the way buildHowTos.ts does.
        const entry: HowToBundleEntry = {
            id: how.id,
            title: how.title,
            category: how.category,
            body,
            related: how.related,
        };

        const restored = bundleEntryToHowTo(entry);
        expect(restored.id).toBe(how.id);
        expect(restored.title).toBe(how.title);
        expect(restored.category).toBe(how.category);
        expect(restored.related).toEqual(how.related);
        // The re-parsed body produces equivalent markup.
        expect(restored.content.toWordplay()).toBe(how.content.toWordplay());
    });
});

// Integration test description for manual testing
describe('verifyHowTo integration', () => {
    it('should be tested manually with actual file system', () => {
        // This test documents the expected behavior for manual testing:
        //
        // 1. Run: npx tsx src/util/verify-locales/start.ts verify fr-FR
        //    Expected: Should show "Missing X how-to files for fr-FR"
        //
        // 2. Run: npx tsx src/util/verify-locales/start.ts verify en-US
        //    Expected: Should complete without how-to messages (skips en-US)
        //
        // 3. Run: npx tsx src/util/verify-locales/start.ts translate de-DE
        //    Expected: Should attempt translation (will fail without Google Cloud credentials)
        //
        // This ensures the implementation works correctly with real file system operations
        // without complex mocking that causes TypeScript issues.

        expect(true).toBe(true); // Placeholder assertion
    });
});

describe('how-to example checking', () => {
    // The rule that makes the check usable at all: a how-to's prose quotes
    // tokens inline constantly ("the \→ ''\ turns it into text"), and analyzing
    // those as programs buries the real defects under a thousand fragments.
    it('tells a runnable block from a token quoted mid-sentence', () => {
        const examples = getDocExamples(
            "Set it with \\count\\ and watch:\n\n\\\nPhrase(count → '')\n\\\n\nThat's it.",
        );
        expect(examples.map((example) => example.block)).toEqual([false, true]);
    });

    it('finds a conflict in a block example', () => {
        const [example] = getDocExamples('\n\\\nPhrase(nosuchname)\n\\\n');
        expect(example.block).toBe(true);
        expect(analyzeCode(example.code, DefaultLocale).conflicts).not.toEqual(
            [],
        );
    });

    // Every one of these ships to creators as a runnable preview tile, so a
    // broken one is a broken lesson. This is the whole reason the check exists.
    it('every en-US how-to block example analyzes cleanly', () => {
        const dir = path.join('static', 'locales', 'en-US', 'how');
        const broken: string[] = [];
        for (const id of HowToIDs) {
            const file = path.join(dir, `${id}.txt`);
            if (!fs.existsSync(file)) continue;
            const { body } = parseHowTo(id, fs.readFileSync(file, 'utf8'));
            if (body === null) continue;
            for (const example of getDocExamples(body)) {
                if (!example.block || example.expectsDefect) continue;
                const result = analyzeCode(example.code, DefaultLocale);
                if (result.error || result.conflicts.length > 0)
                    broken.push(
                        `${id}: ${result.error ?? result.conflicts.join(', ')}`,
                    );
            }
        }
        expect(broken).toEqual([]);
    });
});

/**
 * The regression test the pipeline never had.
 *
 * Rewriting a how-to means parsing it and serializing it back, and that round
 * trip used to destroy the file: `parseHowTo` built its markup with
 * `parseLocaleDoc`, which reports no spacing, and `howToToString` then asked
 * `getPreferredSpaces` to invent some from an empty map. `Paragraph.segments`
 * declares none, so every segment in a paragraph was joined with nothing — 36
 * of the 37 en-US how-tos came back damaged, sentences run together and every
 * block example flattened onto one line. That is what every translation in
 * every locale was built from (#1364).
 */
describe('the how-to round trip', () => {
    const dir = path.join('static', 'locales', 'en-US', 'how');

    it.each(
        HowToIDs.filter((id) => fs.existsSync(path.join(dir, `${id}.txt`))),
    )('%s survives parsing and serializing unchanged', (id) => {
        const original = fs
            .readFileSync(path.join(dir, `${id}.txt`), 'utf8')
            .trim();
        const { how, spaces } = parseHowTo(id, original);
        expect(how).not.toBeNull();
        if (how === null) return;
        // The tokenizer strips the emoji color selector from all source, so
        // that normalization is the one difference a round trip may make.
        expect(howToToString(how, spaces ?? undefined).trim()).toBe(
            withoutColorSelector(original).trim(),
        );
    });

    it('keeps a line break inside a paragraph when both its prose runs are replaced', () => {
        const body = 'First line here.\nSecond line here.';
        const [markup, original] = toMarkup(body);
        let spaces = original;
        let replaced = markup;
        for (const leaf of markup.leaves()) {
            if (!leaf.isSymbol(Sym.Words)) continue;
            const token = new Token(`translated ${leaf.getText()}`, Sym.Words);
            spaces = spaces.withReplacement(leaf, token);
            replaced = replaced.replace(leaf, token);
        }
        // Without carrying the spaces over this reads "…here.translated…".
        expect(replaced.toWordplay(spaces)).toContain('\n');
    });
});

describe('re-padding a translated prose run', () => {
    it('gives back the spaces the source token carried', () => {
        expect(padLike('a ', 'ein')).toBe('ein ');
        expect(padLike(' has a ', 'hat ein')).toBe(' hat ein ');
        expect(padLike('with ', 'mit')).toBe('mit ');
    });

    it('does not double-space a translation that kept its own', () => {
        expect(padLike(' has a ', ' hat ein ')).toBe(' hat ein ');
    });

    it('pads next to code and italic spans, not only names', () => {
        // `a \z\ value of \10m\ so` — the runs around a \code\ span each carry an
        // edge space, and the old name-only rule left them glued.
        expect(padLike('a ', 'ein')).toBe('ein ');
        expect(padLike(' value of ', ' Wert von ')).toBe(' Wert von ');
    });

    /**
     * English writes `@Row, which arranges…` and German writes `@Row machen,
     * die…`: the run after a link begins with punctuation in one language and a
     * word in the other, so copying English's spacing alone glues them.
     */
    it('adds a word boundary a reordered translation needs', () => {
        const link = new Token('@Row', Sym.Concept);
        expect(padLike(', which arranges ', 'machen, die ', link)).toBe(
            ' machen, die ',
        );
        // …but not when the translation keeps English's punctuation.
        expect(padLike(', which arranges ', ', die ', link)).toBe(', die ');
        // …and not when the neighbour is ordinary prose.
        const prose = new Token('words', Sym.Words);
        expect(padLike(', which arranges ', 'machen, die ', prose)).toBe(
            'machen, die ',
        );
    });

    /**
     * A zero-width space is a translator artifact the markup tokenizer drops, so
     * a body carrying one stops being markup partway through. The zero-width
     * non-joiner beside it is orthography and must survive.
     */
    it('drops a zero-width space but keeps a zero-width non-joiner', () => {
        expect(padLike('a ', 'ein\u200b')).toBe('ein ');
        expect(padLike('a ', 'mi\u200cravad')).toBe('mi\u200cravad ');
    });

    /**
     * A prose run is one token and a token ends at a newline, so a translation
     * carrying one would be read back as two runs and the file would no longer
     * have the structure it was written with.
     */
    it('collapses a line break inside a translation', () => {
        expect(padLike('a ', 'więc\nzatrzymuje')).toBe('więc zatrzymuje ');
    });

    it('leaves an all-whitespace run alone', () => {
        expect(padLike(' ', 'anything')).toBe(' ');
    });
});

describe('deciding whether a how-to still needs translating', () => {
    const english = 'Make a thing\n\nHere is how you make a thing.\n';

    it('translates a locale that has no file yet', () => {
        expect(howToNeedsTranslation(english, english, true, false)).toBe(true);
    });

    it('leaves a real translation alone', () => {
        expect(
            howToNeedsTranslation(
                english,
                'Etwas machen\n\nSo geht es.\n',
                false,
                false,
            ),
        ).toBe(false);
    });

    it('re-translates a machine translation only when overriding', () => {
        const machine = `${MachineTranslated}Etwas machen\n\nSo geht es.\n`;
        expect(howToNeedsTranslation(english, machine, false, false)).toBe(
            false,
        );
        expect(howToNeedsTranslation(english, machine, false, true)).toBe(true);
    });

    it('re-translates a how-to named explicitly with +howto', () => {
        // A how-to `.txt` carries no `$~`, so the machine-translated test is
        // false for every translated how-to and a damaged one had no way back
        // short of deleting the file. `+howto:<id>` is already an explicit
        // request for that file.
        const translated = 'Título\n\nCuerpo en español.';
        expect(
            howToNeedsTranslation(english, translated, false, true, true),
        ).toBe(true);
        // Only under override, and only when named.
        expect(
            howToNeedsTranslation(english, translated, false, false, true),
        ).toBe(false);
        expect(
            howToNeedsTranslation(english, translated, false, true, false),
        ).toBe(false);
    });

    it('translates a file that is still a copy of the English', () => {
        // The case that made every music how-to stay English in all 29
        // locales: a missing how-to fails verification, copying the English
        // file silences that, and a copy used to look translated forever.
        expect(howToNeedsTranslation(english, english, false, false)).toBe(
            true,
        );
    });
});

describe('the how-tos that are still untranslated', () => {
    it('is only ever because nobody has run the translator', () => {
        // A guard on the fix above rather than on the content: any how-to that
        // still matches English must now be visible to the translator, so this
        // fails if the copy case is ever quietly excluded again.
        const howDir = (locale: string) =>
            path.join('static', 'locales', locale, 'how');
        const locales = fs
            .readdirSync(path.join('static', 'locales'))
            .filter((l) => l !== 'en-US' && fs.existsSync(howDir(l)));
        for (const name of fs.readdirSync(howDir('en-US'))) {
            const english = fs.readFileSync(
                path.join(howDir('en-US'), name),
                'utf-8',
            );
            for (const locale of locales) {
                const file = path.join(howDir(locale), name);
                if (!fs.existsSync(file)) continue;
                const target = fs.readFileSync(file, 'utf-8');
                if (target !== english) continue;
                expect(
                    howToNeedsTranslation(english, target, false, false),
                    `${locale}/${name} is a copy of the English`,
                ).toBe(true);
            }
        }
    });
});

describe('guarding a localized example', () => {
    /** Parse one `\…\` example the way the translator's round trip does. */
    function example(code: string): Example {
        const found = parseDoc(toTokens(DOCS_SYMBOL + code + DOCS_SYMBOL))
            .nodes()
            .find((node): node is Example => node instanceof Example);
        if (found === undefined) throw new Error(`not an example: ${code}`);
        return found;
    }

    const english = example(
        '\\Music([\n\tTrack(tune instrument: Instrument.flute)\n])\\',
    );

    it('accepts a localization that only renames and re-texts', () => {
        // What localizing an example is supposed to do: the same program with
        // localized names, which the emoji forms of the basis names also are.
        expect(
            localizedExampleIsSound(
                english,
                example('\\🎼([\n\t🎶(melodie instrument: 🔈.🪈)\n])\\'),
            ),
        ).toBe(true);
    });

    it('rejects code that lost a space between two names', () => {
        // The real failure: `tune instrument:` came back as `tuneinstrument:`,
        // which still parses — so "did it parse?" was never enough of a check.
        expect(
            localizedExampleIsSound(
                english,
                example('\\🎼([\n\t🎶(tuneinstrument: 🔈.🪈)\n])\\'),
            ),
        ).toBe(false);
    });

    it('rejects a note list whose numbers ran together', () => {
        // `[1 5 8 5 6 3 1 ø]` came back as `[1585631 ø]`: eight notes to one.
        expect(
            localizedExampleIsSound(
                example('\\tune: [1 5 8 5 6 3 1 ø]\\'),
                example('\\tune: [1585631 ø]\\'),
            ),
        ).toBe(false);
    });

    it('rejects code that lost a delimiter', () => {
        expect(
            localizedExampleIsSound(
                english,
                example('\\🎼([\n\t🎶(tune instrument: 🔈.🪈)\\'),
            ),
        ).toBe(false);
    });
});
