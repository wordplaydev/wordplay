import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import {
    canRepresent,
    hasUnclosedDelimiter,
    isWholeMarkup,
    markupToSource,
    sourceToMarkup,
} from '@edit/markup/markupSource';
import DefaultLocale from '@locale/DefaultLocale';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { withoutColorSelector } from '@unicode/emoji';
import UnicodeString from '@unicode/UnicodeString';
import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { RepoRoot } from '@util/testFiles';

/**
 * @sweep static/locales The markup editor's model must hold for every string the app
 * ships, and the cost of proving that scales with the locale corpus rather than with
 * the code under test.
 *
 * The markup editor edits prose as a `¶…¶`-wrapped {@link Source}, which is only sound
 * if two things are true of *real* content, not just of hand-picked cases: the wrapped
 * source round-trips byte-for-byte, and typing the text through `Caret.insert` produces
 * exactly the text typed. The second is the load-bearing one — the tokenizer carries a
 * mode stack (`branchDepth`, `inTag`, the container stack) that has to reconstruct
 * correctly from every partially-typed prefix, and nothing else in the suite exercises
 * that over prose.
 */

/** Locales to sweep. All of them: a tokenizer bug in one script would otherwise ship. */
const Locales = readdirSync(resolve(RepoRoot, 'static/locales')).filter(
    (name) => !name.startsWith('.'),
);

function collectStrings(value: unknown, into: string[]): void {
    if (typeof value === 'string') into.push(value);
    else if (Array.isArray(value))
        for (const v of value) collectStrings(v, into);
    else if (value !== null && typeof value === 'object')
        for (const v of Object.values(value)) collectStrings(v, into);
}

function readJSON(path: string): unknown {
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
        return undefined;
    }
}

/** Every markup-bearing string the app ships, tagged by where it came from. */
function corpus(): { origin: string; text: string }[] {
    const found: { origin: string; text: string }[] = [];
    const add = (origin: string, values: string[]) => {
        for (const raw of values) {
            // Match what an editor is actually handed. Write-status markers
            // (`$?`/`$!`/`$~`) are metadata the editing surfaces already strip
            // (MarkupHTMLView seeds its editor with `withoutAnnotations`), and a
            // lone `$~` is not markup a creator typed. Color selectors are
            // normalized because the tokenizer strips them from all source;
            // markupSource.test.ts pins that behavior directly.
            const text = withoutColorSelector(withoutAnnotations(raw));
            if (text.length > 0) found.push({ origin, text });
        }
    };

    const en: string[] = [];
    collectStrings(readJSON(resolve(RepoRoot, 'src/locale/en-US.json')), en);
    add('en-US.json', en);

    for (const locale of Locales) {
        const dir = resolve(RepoRoot, 'static/locales', locale);
        for (const file of [
            `${locale}.json`,
            `${locale}-tutorial.json`,
            `${locale}-quick-tutorial.json`,
        ]) {
            const strings: string[] = [];
            collectStrings(readJSON(resolve(dir, file)), strings);
            add(file, strings);
        }
        let howtos: string[] = [];
        try {
            howtos = readdirSync(resolve(dir, 'how'));
        } catch {
            howtos = [];
        }
        for (const file of howtos)
            add(`${locale}/how/${file}`, [
                readFileSync(resolve(dir, 'how', file), 'utf-8'),
            ]);
    }
    return found;
}

const Corpus = corpus();

test('the corpus is big enough to be worth sweeping', () => {
    // A guard against silently sweeping nothing if the layout moves.
    expect(Corpus.length).toBeGreaterThan(10000);
});

describe('every shipped string survives the markup model', () => {
    /**
     * The classification, rather than a bare "must be empty": three of these
     * buckets are known and accepted, and what matters is that they don't grow.
     * A regression that pushed a new string into `unrepresentable` would be a
     * string the editor silently rewrites, which is the failure worth catching.
     */
    const classify = () => {
        const exact: string[] = [];
        const colorSelectorOnly: string[] = [];
        const notWholeMarkup: { where: string; text: string }[] = [];
        const unrepresentable: string[] = [];
        for (const { origin, text } of Corpus) {
            const source = markupToSource(text);
            const out = sourceToMarkup(source);
            const where = `${origin}: ${text.slice(0, 80)}`;
            if (out === text) exact.push(where);
            else if (!isWholeMarkup(source))
                notWholeMarkup.push({ where, text });
            else if (out === withoutColorSelector(text))
                colorSelectorOnly.push(where);
            else unrepresentable.push(where);
        }
        return { exact, colorSelectorOnly, notWholeMarkup, unrepresentable };
    };

    const result = classify();

    test('almost every string round-trips exactly', () => {
        // The overwhelming majority: wrapped, parsed, and serialized back byte for byte.
        expect(result.exact.length / Corpus.length).toBeGreaterThan(0.99);
    });

    test('the rest differ only by emoji color selectors', () => {
        // Accepted: the tokenizer strips U+FE0F from all source and the app
        // re-applies it when rendering. Capped so the bucket can't quietly grow.
        expect(result.colorSelectorOnly.length).toBeLessThan(2000);
    });

    test('the strings that escape the wrapper are a known, tiny set', () => {
        // An unclosed container delimiter escapes the wrapper, leaving part of
        // the text parsed as something other than prose. The editor refuses
        // these via canRepresent and falls back to a plain field.
        expect(
            result.notWholeMarkup.map(({ where }) => where).length,
        ).toBeLessThanOrEqual(8);
        // Every one carries one of the three container delimiters, and nothing
        // else reaches this bucket.
        for (const { where, text } of result.notWholeMarkup)
            expect(/[¶`\\]/.test(text), where).toBe(true);
    });

    test('at most a handful of strings are unrepresentable, and none silently', () => {
        // Currently 2, both es-MX tutorial strings carrying zero-width spaces
        // (U+200B) that the tokenizer drops as whitespace. They are refused by
        // canRepresent, so the editor never rewrites them.
        expect(result.unrepresentable.length).toBeLessThanOrEqual(4);
    });
});

/**
 * Type a markup string grapheme by grapheme into an empty wrapped source, the way
 * a creator would, and return what lands. Starts from `¶¶` with the caret between
 * the delimiters, which is the editor's empty state.
 */
function typeMarkup(markup: string): string {
    let source = markupToSource('');
    let caret: Caret = new Caret(source, 1, undefined, undefined);
    for (const grapheme of new UnicodeString(markup).getGraphemes()) {
        const project = Project.make(null, 'markup', source, [], DefaultLocale);
        const result = caret.insert(grapheme, false, project, true);
        if (!Array.isArray(result))
            throw new Error(
                `Typing ${JSON.stringify(grapheme)} into ${JSON.stringify(
                    source.getCode().toString(),
                )} at ${JSON.stringify(caret.position)} produced no edit`,
            );
        caret = result[1];
        source = caret.source;
    }
    return sourceToMarkup(source);
}

/**
 * Typing is quadratic in the string's length (each keystroke reparses), so the
 * type-through runs over a bounded, deterministic sample rather than the whole
 * corpus: every string that carries a markup delimiter, shortest first, capped.
 * Delimiters are what the tokenizer's mode stack keys on, so plain prose adds
 * length without adding coverage.
 */
const Delimited = Corpus.filter(({ text }) => /[*/_^~\\<>@$[\]•¶`]/.test(text))
    .filter(({ text }) => text.length <= 240)
    .sort((a, b) => a.text.length - b.text.length || (a.text < b.text ? -1 : 1))
    .filter((_, index) => index % 7 === 0)
    .slice(0, 900);

test('the type-through sample is representative', () => {
    expect(Delimited.length).toBeGreaterThan(500);
});

describe('typing a shipped string produces exactly that string', () => {
    test('all sampled', () => {
        const broken: string[] = [];
        let checked = 0;
        for (const { origin, text } of Delimited) {
            const source = markupToSource(text);
            // Two exclusions, both principled rather than convenient. Text the
            // model can't represent is text the editor refuses outright. And an
            // unclosed delimiter can't be typed back by construction: the
            // completer pairs `*` as you type it, so the locale's `1/4` — a
            // fraction, not an italic run — necessarily comes back as `1/4/`.
            // The code editor's TypeThrough.test.ts scopes itself the same way,
            // to programs that are syntactically correct.
            if (!canRepresent(text) || hasUnclosedDelimiter(source)) continue;
            checked++;
            let typed: string;
            try {
                typed = typeMarkup(text);
            } catch (error) {
                broken.push(`${origin}: ${(error as Error).message}`);
                continue;
            }
            if (typed !== text)
                broken.push(
                    `${origin}: typed ${JSON.stringify(
                        typed.slice(0, 120),
                    )} but wanted ${JSON.stringify(text.slice(0, 120))}`,
                );
        }
        expect(
            broken.slice(0, 10),
            'Typing these strings through Caret.insert did not reproduce them. The markup editor cannot use the shared caret model until this is empty.',
        ).toEqual([]);
        // Guard against the exclusions above quietly emptying the sample.
        expect(checked).toBeGreaterThan(300);
    });
});
