import TokenCategories from '@components/editor/tokens/TokenCategories';
import { Sym, type SymType } from '@nodes/Sym';
import { KeywordIds, Keywords } from '@parser/Keywords';
import {
    CodeTokenRules,
    MarkupTokenRules,
    PatternTokenRules,
} from '@parser/Tokenizer';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
    buildGrammar,
    buildLanguageConfiguration,
    buildProvenance,
    getScopes,
    GrammarFile,
    LanguageConfigurationFile,
    scopeCategory,
} from './grammar';
import { buildTheme } from './theme';

/**
 * Guards the `.wp` grammar against tokenizer drift. The grammar is generated
 * from the tokenizer's own rule lists and colored by Wordplay's own token
 * categories, so a new Sym, a renamed glyph, or a recategorized token fails
 * here rather than silently leaving `.wp` files colored by last month's rules.
 *
 * These checks verify the Sym→scope *mapping*. They do not run a TextMate
 * engine, so the regexes and the begin/end nesting are verified by eye in VS
 * Code — see the extension README's verification notes.
 */

describe('drift', () => {
    test('committed grammar matches the generator', () => {
        const committed: unknown = JSON.parse(
            readFileSync(GrammarFile, 'utf-8'),
        );
        expect(committed).toEqual(buildGrammar());
    });

    test('committed language configuration matches the generator', () => {
        const committed: unknown = JSON.parse(
            readFileSync(LanguageConfigurationFile, 'utf-8'),
        );
        expect(committed).toEqual(buildLanguageConfiguration());
    });
});

/**
 * Categorized Syms the grammar deliberately gives no rule of its own, each for
 * a reason a static grammar can't get around.
 */
const SymsWithoutGrammarRules = new Map<SymType, string>([
    // Secondary Sym types. A token's first type decides its color — that's what
    // getTokenCategory reads — so the grammar colors by the first type too, and
    // these never get to name a scope.
    [Sym.Exponent, 'a secondary type of the `^` operator'],
    [Sym.Product, 'a secondary type of the `·` operator'],
    [Sym.Percent, 'a secondary type of the `%` operator'],
    [
        Sym.Conditional,
        'a secondary type of `?`, whose first type is BooleanType',
    ],
    // Ambient text inside a doc or a formatted literal, colored by the span it
    // sits in rather than by a rule of its own.
    [Sym.Words, 'markup words, colored by their enclosing doc or literal'],
    // The end-of-source token has no text to color.
    [Sym.End, 'the end-of-source token, which has no text'],
    // A static grammar's fallback is the name rule, so it never produces one.
    [Sym.Unknown, 'unrecognizable text, which falls to the name rule instead'],
    // Declared with a category, but no tokenizer rule emits it.
    [Sym.PatternSlash, 'no tokenizer rule emits it'],
]);

/**
 * The two places the grammar knowingly disagrees with getTokenCategory, because
 * it follows what the app *renders* rather than what the category table says.
 */
const KnownDivergences = new Map<SymType, string>([
    // `delimiter` by category, but TokenView.svelte's `:global(.Language)` rule
    // paints the whole `/en` tag with the type color.
    [Sym.Language, 'rendered with the type color by a CSS override'],
    // `share` by category. A link that doesn't look like a link is worse than a
    // color mismatch.
    [Sym.URL, 'rendered as a link so it reads as one'],
]);

/** Every string in the grammar, so a glyph search doesn't fight JSON escaping. */
function grammarStrings(): string[] {
    const strings: string[] = [];
    const visit = (value: unknown): void => {
        if (typeof value === 'string') strings.push(value);
        else if (Array.isArray(value)) value.forEach(visit);
        else if (value !== null && typeof value === 'object')
            Object.values(value).forEach(visit);
    };
    visit(buildGrammar());
    return strings;
}

/**
 * The scopes a Sym claims that carry a Wordplay token color. A markup formatting
 * scope (`markup.bold`, `markup.italic`) gives weight or slant instead, and its
 * glyph is the same string as a code Sym — `^` is both Extra and Exponent — so
 * it is not evidence that the code Sym got colored.
 */
function colorScopes(sym: SymType): string[] {
    return (buildProvenance().get(sym) ?? []).filter(
        (scope) => scopeCategory(scope) !== undefined,
    );
}

describe('coverage', () => {
    test('every categorized Sym has a grammar rule', () => {
        const provenance = buildProvenance();
        const missing = [...TokenCategories.keys()].filter(
            (sym) =>
                colorScopes(sym).length === 0 &&
                // A divergence still needs a rule, just not a scope that reads
                // back as its category.
                !(KnownDivergences.has(sym) && provenance.has(sym)) &&
                !SymsWithoutGrammarRules.has(sym),
        );
        expect(missing).toEqual([]);
    });

    test('the allowlist has no stale entries', () => {
        const claimed = [...SymsWithoutGrammarRules.keys()].filter(
            (sym) => colorScopes(sym).length > 0,
        );
        expect(claimed).toEqual([]);
    });

    test("every scope agrees with its Sym's token category", () => {
        const mismatches = [...buildProvenance().keys()]
            .filter((sym) => !KnownDivergences.has(sym))
            .filter((sym) => TokenCategories.has(sym))
            .flatMap((sym) =>
                colorScopes(sym)
                    .filter(
                        (scope) =>
                            scopeCategory(scope) !== TokenCategories.get(sym),
                    )
                    .map(
                        (scope) =>
                            `${String(sym)}: ${scope} reads as ${String(scopeCategory(scope))}, but its category is ${String(TokenCategories.get(sym))}`,
                    ),
            );
        expect(mismatches).toEqual([]);
    });

    test('every keyword glyph and tokenizer literal appears in the grammar', () => {
        // Undo one level of regex escaping, so a glyph the grammar had to escape
        // (`?`, `|`, `*`, and `\` itself) is still found by a literal search.
        const grammar = grammarStrings().join('\n').replace(/\\(.)/g, '$1');
        const glyphs = new Set([
            ...KeywordIds.map((id) => Keywords[id].symbol),
            ...[
                ...CodeTokenRules,
                ...PatternTokenRules,
                ...MarkupTokenRules,
            ].flatMap((rule) =>
                rule.literal === undefined ? [] : [rule.literal],
            ),
        ]);
        const missing = [...glyphs].filter((glyph) => !grammar.includes(glyph));
        expect(missing).toEqual([]);
    });
});

/** The generated theme entry each Wordplay token category should resolve to. */
const CategoryEntries: Record<string, string> = {
    docs: 'Docs',
    delimiter: 'Delimiters',
    relation: 'Relations',
    operator: 'Operators and keywords',
    type: 'Types',
    share: 'Operators and keywords',
    eval: 'Evaluation markers',
    literal: 'Literals',
    name: 'Names',
    placeholder: 'Placeholders',
};

/**
 * The theme entry that wins for a scope. TextMate resolves the most specific
 * matching selector, which for these single-element selectors is the longest.
 */
function winningEntry(scope: string): string | undefined {
    let winner: { name: string; length: number } | undefined;
    for (const entry of buildTheme('light').tokenColors)
        for (const selector of entry.scope)
            if (
                (selector === scope || scope.startsWith(`${selector}.`)) &&
                (winner === undefined || selector.length > winner.length)
            )
                winner = { name: entry.name, length: selector.length };
    return winner?.name;
}

describe('theme', () => {
    test('every colored scope resolves to its category’s theme entry', () => {
        const wrong = getScopes()
            .filter((scope) => scopeCategory(scope) !== undefined)
            .filter((scope) => {
                const category = scopeCategory(scope);
                return (
                    category !== undefined &&
                    winningEntry(scope) !== CategoryEntries[category]
                );
            })
            .map(
                (scope) =>
                    `${scope} resolves to ${String(winningEntry(scope))}, expected ${String(CategoryEntries[String(scopeCategory(scope))])}`,
            );
        expect([...new Set(wrong)]).toEqual([]);
    });
});
