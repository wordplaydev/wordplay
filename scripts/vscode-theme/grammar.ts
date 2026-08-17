/**
 * Derives a TextMate grammar and language configuration for `.wp` files from the
 * app's own tokenizer, so a `.wp` file in VS Code is colored the way the app's
 * editor colors it.
 *
 * Nothing here retypes a glyph: every rule's pattern comes from the serialized
 * tokenizer rule lists (CodeTokenRules / PatternTokenRules / MarkupTokenRules),
 * in the tokenizer's own order, and every scope is chosen so that its Wordplay
 * token category (TokenCategories.ts) matches the color the generated theme
 * gives that scope. A tokenizer change that isn't regenerated fails
 * vscodeGrammarSync.test.ts.
 *
 * What the tokenizer expresses as a context stack, TextMate expresses as rule
 * recursion — that translation is the hand-written part of this file, and the
 * only part a Sym rename can't catch.
 */

import { Sym, type SymType } from '@nodes/Sym';
import {
    CodeTokenRules,
    DelimiterCloseByOpen,
    FormattingSymbols,
    MarkupSymbols,
    MarkupTokenRules,
    NameRegExPattern,
    PairedCloseDelimiters,
    PatternTokenRules,
    StrictURLRegEx,
    TextCloseByTextOpen,
    type SerializedTokenRule,
} from '@parser/Tokenizer';
import {
    DOCS_SYMBOL,
    ELISION_SYMBOL,
    FORMATTED_SYMBOL,
    PATTERN_DELIMITER_SYMBOL,
} from '@parser/Symbols';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const Root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const SyntaxesDirectory = resolve(
    Root,
    '.vscode/wordplay-theme/syntaxes',
);

export const GrammarFile = resolve(
    SyntaxesDirectory,
    'wordplay.tmLanguage.json',
);

export const LanguageConfigurationFile = resolve(
    Root,
    '.vscode/wordplay-theme/language-configuration.json',
);

/** The grammar's scope name, matched by `contributes.grammars` in package.json. */
const ScopeName = 'source.wordplay';

/* -------------------------------------------------------------------------- */
/* Scopes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The TextMate scope for each Sym that decides a token's color. Chosen so a
 * stock theme colors `.wp` sensibly *and* the generated Wordplay theme's
 * existing `getTokenColors` families already match — see the table in the
 * extension README. `scopeCategory` below is the inverse, and the sync test
 * asserts every entry here agrees with TokenCategories.
 *
 * Syms with no TokenCategories entry render at ambient foreground in the app,
 * so they take an uncolored `meta.*` scope. They still need rules: none of `⬚`,
 * `◆`, or `🌎` is a reserved symbol, so without one they'd fall to the name rule.
 */
const SymScopes: Map<SymType, string> = new Map([
    // Delimiters (dark grey).
    [Sym.EvalOpen, 'punctuation.section.group.begin.wordplay'],
    [Sym.EvalClose, 'punctuation.section.group.end.wordplay'],
    [Sym.ListOpen, 'punctuation.section.list.begin.wordplay'],
    [Sym.ListClose, 'punctuation.section.list.end.wordplay'],
    [Sym.SetOpen, 'punctuation.section.set.begin.wordplay'],
    [Sym.SetClose, 'punctuation.section.set.end.wordplay'],
    [Sym.TypeOpen, 'punctuation.section.type.begin.wordplay'],
    [Sym.TypeClose, 'punctuation.section.type.end.wordplay'],
    [Sym.TableOpen, 'punctuation.section.table.begin.wordplay'],
    [Sym.TableClose, 'punctuation.section.table.end.wordplay'],
    [Sym.Separator, 'punctuation.separator.comma.wordplay'],
    [Sym.TagOpen, 'punctuation.definition.tag.begin.wordplay'],
    [Sym.TagClose, 'punctuation.definition.tag.end.wordplay'],

    // Relations (orange).
    [Sym.Bind, 'punctuation.separator.key-value.wordplay'],
    [Sym.Access, 'punctuation.accessor.wordplay'],
    [Sym.Type, 'keyword.operator.type.annotation.wordplay'],
    [Sym.Literal, 'keyword.operator.type.annotation.wordplay'],

    // Operators (orange).
    [Sym.Operator, 'keyword.operator.wordplay'],
    [Sym.Otherwise, 'keyword.operator.otherwise.wordplay'],
    [Sym.Match, 'keyword.operator.match.wordplay'],
    [Sym.Change, 'keyword.operator.change.wordplay'],
    [Sym.Previous, 'keyword.operator.previous.wordplay'],
    [Sym.Select, 'keyword.operator.table.wordplay'],
    [Sym.Insert, 'keyword.operator.table.wordplay'],
    [Sym.Update, 'keyword.operator.table.wordplay'],
    [Sym.Delete, 'keyword.operator.table.wordplay'],

    // Types (orange).
    [Sym.NumberType, 'support.type.number.wordplay'],
    [Sym.Concept, 'entity.name.type.concept.wordplay'],
    [Sym.Link, 'entity.name.type.link.wordplay'],

    // Sharing (orange).
    [Sym.Borrow, 'keyword.control.import.wordplay'],
    [Sym.Share, 'keyword.control.export.wordplay'],

    // Evaluation markers (blue).
    [Sym.Function, 'storage.type.function.wordplay'],
    [Sym.Convert, 'keyword.operator.arrow.wordplay'],

    // Literals (blue).
    [Sym.None, 'constant.language.none.wordplay'],
    [Sym.Boolean, 'constant.language.boolean.wordplay'],
    [Sym.BooleanType, 'constant.language.boolean-type.wordplay'],
    [Sym.FormattedType, 'constant.language.formatted-type.wordplay'],
    [Sym.Number, 'constant.numeric.wordplay'],
    [Sym.Decimal, 'constant.numeric.decimal.wordplay'],
    [Sym.Base, 'constant.numeric.base.wordplay'],
    [Sym.RomanNumeral, 'constant.numeric.roman.wordplay'],
    [Sym.HanNumeral, 'constant.numeric.han.wordplay'],
    [Sym.ThaiNumeral, 'constant.numeric.thai.wordplay'],
    [Sym.BengaliNumeral, 'constant.numeric.bengali.wordplay'],
    [Sym.DevanagariNumeral, 'constant.numeric.devanagari.wordplay'],
    [Sym.GujaratiNumeral, 'constant.numeric.gujarati.wordplay'],
    [Sym.GurmukhiNumeral, 'constant.numeric.gurmukhi.wordplay'],
    [Sym.KannadaNumeral, 'constant.numeric.kannada.wordplay'],
    [Sym.TamilNumeral, 'constant.numeric.tamil.wordplay'],
    [Sym.TeluguNumeral, 'constant.numeric.telugu.wordplay'],
    [Sym.Pi, 'constant.numeric.pi.wordplay'],
    [Sym.Infinity, 'constant.numeric.infinity.wordplay'],
    [Sym.Text, 'punctuation.definition.string.wordplay'],
    [Sym.PatternText, 'string.quoted.pattern.wordplay'],
    [Sym.PatternDelimiter, 'punctuation.definition.string.pattern.wordplay'],

    // Docs (purple).
    [Sym.Doc, 'punctuation.definition.comment.wordplay'],
    [Sym.Code, 'punctuation.definition.comment.code.wordplay'],

    // Names and placeholders.
    [Sym.Name, 'variable.other.wordplay'],
    [Sym.Placeholder, 'variable.language.placeholder.wordplay'],

    // Pattern atoms (orange), all one scope: they're the pattern sublanguage's
    // character classes, quantifiers, and anchors.
    [Sym.PatternAny, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternLetter, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternDigit, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternSpace, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternRest, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternWord, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternWordEdge, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternStart, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternEnd, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternAhead, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternBehind, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternFold, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternRange, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternComplement, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternAlternation, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternEqual, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternGreater, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternGreaterEqual, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternLess, 'keyword.operator.pattern.wordplay'],
    [Sym.PatternLessEqual, 'keyword.operator.pattern.wordplay'],

    [Sym.ExternalExample, 'markup.fenced_code.wordplay'],

    // Uncategorized in the app, so uncolored here: meta.* matches no theme rule.
    [Sym.This, 'meta.this.wordplay'],
    [Sym.Stream, 'meta.stream.wordplay'],
    [Sym.Initial, 'meta.initial.wordplay'],
    [Sym.Translate, 'meta.translate.wordplay'],
    [Sym.Locale, 'meta.locale.wordplay'],
    [Sym.Mention, 'meta.mention.wordplay'],
    // The formatted literal's own `` ` `` delimiters. The app leaves them
    // ambient, but TextMate can't express "no color" for a token inside a
    // colored span, so they take the string delimiter scope like a text quote.
    [Sym.Formatted, 'punctuation.definition.string.wordplay'],

    // The `|` separating a mention's branches.
    [Sym.Union, 'keyword.operator.branch.wordplay'],

    // Two deliberate divergences from TokenCategories; see KnownDivergences in
    // the sync test.
    // A `/en` tag is `delimiter` grey by category, but TokenView.svelte's
    // `:global(.Language)` rule paints the whole tag with the type color, and
    // the grammar follows what the app renders.
    [Sym.Language, 'entity.name.type.language.wordplay'],
    // A bare URL in markup is `share` orange by category. A link that doesn't
    // look like a link is worse than a color mismatch.
    [Sym.URL, 'markup.underline.link.wordplay'],
]);

/**
 * The markup formatting scopes, kept in their own table because `SymType` is the
 * union of Sym *values* and three of those values collide: `_` is Underline in
 * markup but Placeholder in code, `/` is Italic in markup but Language in code,
 * and `^` is Extra in markup but Exponent in code. One map keyed by SymType
 * would silently give the code meaning the markup scope, or the reverse. These
 * give weight and slant rather than color — the app conveys the same thing by
 * actually styling the words — so none of them carries a token category.
 */
const MarkupSymScopes: Map<SymType, string> = new Map([
    [Sym.Italic, 'markup.italic.wordplay'],
    [Sym.Bold, 'markup.bold.wordplay'],
    [Sym.Extra, 'markup.bold.extra.wordplay'],
    [Sym.Underline, 'markup.underline.wordplay'],
    [Sym.Light, 'markup.other.light.wordplay'],
]);

/** The Wordplay token category a scope stands for, for the sync test's check. */
export function scopeCategory(scope: string): string | undefined {
    if (scope.startsWith('meta.') || scope.startsWith('markup.'))
        return undefined;
    if (scope.startsWith('comment') || scope.includes('definition.comment'))
        return 'docs';
    if (scope.startsWith('string') || scope.includes('definition.string'))
        return 'literal';
    if (scope.startsWith('constant')) return 'literal';
    if (scope.startsWith('variable.language.placeholder')) return 'placeholder';
    if (scope.startsWith('variable')) return 'name';
    if (scope.startsWith('storage.type.function')) return 'eval';
    if (scope.startsWith('keyword.operator.arrow')) return 'eval';
    if (scope.startsWith('keyword.control')) return 'share';
    if (
        scope.startsWith('punctuation.accessor') ||
        scope.startsWith('punctuation.separator.key-value') ||
        scope.startsWith('keyword.operator.type.annotation')
    )
        return 'relation';
    if (scope.startsWith('keyword.operator')) return 'operator';
    if (
        scope.startsWith('entity.name.type') ||
        scope.startsWith('support.type')
    )
        return 'type';
    if (scope.startsWith('punctuation')) return 'delimiter';
    return undefined;
}

/* -------------------------------------------------------------------------- */
/* Regex translation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Rewrite a JS RegExp source for Oniguruma: drop the `^` anchor (Oniguruma's `^`
 * means line start, not match start, and TextMate scans forward within a line),
 * rewrite `\p{Script=X}` to `\p{X}` and `\uHHHH` to `\x{HHHH}` — the spellings
 * Oniguruma understands. Without the last two the Han-numeral and concept rules
 * silently fail to compile and their tokens fall through to the name rule.
 */
function toOniguruma(source: string): string {
    return source
        .replace(/^\^/, '')
        .replace(/\\p\{Script=([A-Za-z]+)\}/g, '\\p{$1}')
        .replace(/\\u([0-9A-Fa-f]{4})/g, '\\x{$1}');
}

/** Escape a literal token so it can be used as a regex. */
function escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);
}

/**
 * The begin or end variant of a delimiter's scope. A delimiter Sym names one
 * scope, but TextMate convention distinguishes the two ends, and a reader
 * inspecting scopes wants to see which one they're on.
 */
function edge(scope: string, which: 'begin' | 'end'): string {
    return scope.replace(/\.wordplay$/, `.${which}.wordplay`);
}

/** The Oniguruma pattern that matches exactly what a tokenizer rule matches. */
function patternOf(rule: SerializedTokenRule): string {
    if (rule.literal !== undefined) return escapeRegex(rule.literal);
    if (rule.source !== undefined) return toOniguruma(rule.source);
    throw new Error('A tokenizer rule has neither a literal nor a source.');
}

/** The first rule in a list that emits `sym`, which is the one that defines it. */
function ruleFor(
    rules: ReadonlyArray<SerializedTokenRule>,
    sym: SymType,
): SerializedTokenRule {
    const rule = rules.find((candidate) => candidate.syms[0] === sym);
    if (rule === undefined)
        throw new Error(
            `No tokenizer rule emits Sym ${String(sym)}; the tokenizer's rule list changed.`,
        );
    return rule;
}

/** The Oniguruma pattern for the rule that defines `sym`. */
function patternFor(
    rules: ReadonlyArray<SerializedTokenRule>,
    sym: SymType,
): string {
    return patternOf(ruleFor(rules, sym));
}

/** The literal glyph of a markup rule, which formatting spans need bare. */
function markupGlyph(sym: SymType): string {
    const { literal } = ruleFor(MarkupTokenRules, sym);
    if (literal === undefined)
        throw new Error(
            `The markup rule for Sym ${String(sym)} is a pattern, not a glyph.`,
        );
    return literal;
}

/* -------------------------------------------------------------------------- */
/* Grammar construction                                                        */
/* -------------------------------------------------------------------------- */

/** A capture may carry its own sub-rules, e.g. a source header's `/lang` tag. */
type Capture = { name: string; patterns?: Rule[] };

type Rule = {
    name?: string;
    match?: string;
    begin?: string;
    end?: string;
    captures?: Record<string, Capture>;
    beginCaptures?: Record<string, Capture>;
    endCaptures?: Record<string, Capture>;
    patterns?: Rule[];
    include?: string;
};

/**
 * A short, stable label for each text delimiter pair, in the order
 * TextCloseByTextOpen declares them. Naming only — the glyphs themselves come
 * from the tokenizer — but the count is checked so a new pair can't be silently
 * dropped from the grammar.
 */
const TextLabels = [
    'double',
    'curly',
    'low',
    'single',
    'curly-single',
    'single-angle',
    'angle',
    'corner',
    'white-corner',
    // The backtick opens markup, not text, so it has no text rule of its own.
    'formatted',
];

/** Syms whose rules the code walk replaces with a begin/end context. */
const CodeContextSyms = new Set<SymType>([
    Sym.Text,
    Sym.Code,
    Sym.Doc,
    Sym.Formatted,
    Sym.PatternDelimiter,
    Sym.Language,
]);

/**
 * The markup formatting spans, in FormattingSymbols order, with the repository
 * key each gets. Naming only — the glyphs come from the tokenizer — but the
 * count is checked so a new formatting symbol can't be silently dropped.
 */
const FormattingSpans: { sym: SymType; key: string }[] = [
    { sym: Sym.Italic, key: 'markup-italic' },
    { sym: Sym.Underline, key: 'markup-underline' },
    { sym: Sym.Bold, key: 'markup-bold' },
    { sym: Sym.Extra, key: 'markup-extra' },
    { sym: Sym.Light, key: 'markup-light' },
];

/** Syms whose markup rules are folded into a begin/end context rule. */
const MarkupContextSyms = new Set<SymType>([
    Sym.Doc,
    Sym.Formatted,
    Sym.Code,
    Sym.ListOpen,
    Sym.ListClose,
    Sym.Link,
    Sym.TagOpen,
    Sym.TagClose,
    Sym.Union,
    ...FormattingSpans.map((span) => span.sym),
]);

/** Syms whose pattern rules are handled by the pattern context's own delimiters. */
const PatternContextSyms = new Set<SymType>([
    Sym.PatternDelimiter,
    Sym.Code,
    Sym.Language,
]);

class Builder {
    /**
     * Every Sym this grammar scopes, and the scopes it gives it. A Sym can have
     * more than one: `SymType` is the union of Sym *values*, and three values
     * collide — `_` is Placeholder, Underline, and LanguageJoin; `/` is Italic
     * and Language; `^` is Extra and Exponent. The app's own `getTokenCategory`
     * can't tell them apart either, so a glyph that means one thing in code and
     * another in markup ends up claiming both scopes.
     */
    readonly provenance = new Map<SymType, string[]>();

    /** Claim a scope for a Sym, recording it for the sync test's coverage checks. */
    scope(sym: SymType, context: 'code' | 'markup' = 'code'): string {
        const scope =
            context === 'markup'
                ? (MarkupSymScopes.get(sym) ?? SymScopes.get(sym))
                : SymScopes.get(sym);
        if (scope === undefined)
            throw new Error(
                `No TextMate scope for Sym ${String(sym)}; add one to SymScopes in grammar.ts.`,
            );
        const claimed = this.provenance.get(sym) ?? [];
        if (!claimed.includes(scope)) claimed.push(scope);
        this.provenance.set(sym, claimed);
        return scope;
    }

    /** A plain match rule for one tokenizer rule, scoped by its primary Sym. */
    match(
        rule: SerializedTokenRule,
        context: 'code' | 'markup' = 'code',
    ): Rule {
        // A numeral rule's second Sym names the numeral system, which is what
        // makes constant.numeric.han distinguishable from constant.numeric.roman.
        const kind = rule.syms[1];
        const sym =
            kind !== undefined &&
            SymScopes.get(kind)?.startsWith('constant.numeric')
                ? kind
                : rule.syms[0];
        return { name: this.scope(sym, context), match: patternOf(rule) };
    }

    /** Walk a rule list in tokenizer order, substituting contexts by Sym. */
    walk(
        rules: ReadonlyArray<SerializedTokenRule>,
        substitutions: Map<SymType, Rule[]>,
        skip: Set<SymType>,
        context: 'code' | 'markup' = 'code',
    ): Rule[] {
        const emitted = new Set<SymType>();
        const patterns: Rule[] = [];
        for (const rule of rules) {
            const sym = rule.syms[0];
            if (sym === undefined) continue;
            if (skip.has(sym)) {
                // Emit a context's includes once, at the position its first
                // tokenizer rule occupies, so rule order is preserved.
                if (emitted.has(sym)) continue;
                emitted.add(sym);
                patterns.push(...(substitutions.get(sym) ?? []));
                continue;
            }
            patterns.push(this.match(rule, context));
        }
        return patterns;
    }
}

/** Build the grammar and the Sym→scope map it establishes. */
function build(): {
    grammar: Record<string, unknown>;
    provenance: ReadonlyMap<SymType, string[]>;
} {
    const b = new Builder();

    const textPairs = Object.entries(TextCloseByTextOpen);
    if (textPairs.length !== TextLabels.length)
        throw new Error(
            `TextCloseByTextOpen has ${textPairs.length} pairs but TextLabels names ${TextLabels.length}; name the new pair in grammar.ts.`,
        );

    const doc = escapeRegex(DOCS_SYMBOL);
    const formatted = escapeRegex(FORMATTED_SYMBOL);
    const elision = escapeRegex(ELISION_SYMBOL);
    /** Pops an unclosed markup span when its enclosing doc or literal ends, so a
     *  missing `*` doesn't swallow the rest of the file. */
    const markupBoundary = `(?=[${doc}${formatted}])`;

    const stringDelimiter = b.scope(Sym.Text);
    const commentDelimiter = b.scope(Sym.Doc);
    const codeDelimiter = b.scope(Sym.Code);

    const repository: Record<string, Rule> = {};

    // The `.wp` container's source headers. The preview-glyph and project-name
    // lines are deliberately not special-cased: TextMate has no document
    // position, and any shape heuristic also fires on ordinary code lines.
    repository['source-header'] = {
        match: '^(===)[ \\t]*(.*)$',
        captures: {
            '1': { name: 'punctuation.definition.heading.wordplay' },
            '2': {
                name: 'entity.name.section.wordplay',
                patterns: [{ include: '#language-tag' }],
            },
        },
    };

    // Elision is Wordplay's comment: `getNextSpace` consumes `*…*` as whitespace,
    // so it produces no tokens at all and can appear anywhere a space can.
    repository['elision'] = {
        name: 'comment.block.elision.wordplay',
        begin: elision,
        end: elision,
    };

    // A `/lang`, `/lang_lang2`, or `/lang-REGION` tag. The tokenizer lexes this
    // as several tokens; the app paints the whole run with the type color, so
    // one rule keeps the tag from breaking into differently colored pieces.
    repository['language-tag'] = {
        name: b.scope(Sym.Language),
        match: '/[a-zA-Z]+(?:_[a-zA-Z]+)*(?:-[a-zA-Z0-9]+)*',
    };

    // `\ … \` inside text or markup: an escape hatch back into code. Because
    // #code includes #text and #text includes #interpolation, this nests to any
    // depth, the way the tokenizer's context stack does.
    repository['interpolation'] = {
        begin: '\\\\',
        beginCaptures: { '0': { name: edge(codeDelimiter, 'begin') } },
        end: '(\\\\)|$',
        endCaptures: { '1': { name: edge(codeDelimiter, 'end') } },
        patterns: [{ include: '#code' }],
    };

    // A literal backslash. Must precede #interpolation, mirroring the
    // tokenizer's `(?<!\\)\\(?!\\)` guard.
    repository['text-escape'] = {
        name: 'constant.character.escape.wordplay',
        match: '\\\\\\\\',
    };

    // Text literals. The `|$` end branch is the tokenizer's rule that an
    // unclosed text ends at the end of the line.
    const textIncludes: Rule[] = [];
    for (const [index, [open, close]] of textPairs.entries()) {
        const label = TextLabels[index];
        if (open === FORMATTED_SYMBOL) continue;
        const key = `text-${label}`;
        repository[key] = {
            name: `string.quoted.${label}.wordplay`,
            begin: escapeRegex(open),
            beginCaptures: { '0': { name: edge(stringDelimiter, 'begin') } },
            end: `(${escapeRegex(close)})|$`,
            endCaptures: { '1': { name: edge(stringDelimiter, 'end') } },
            patterns: [
                { include: '#text-escape' },
                { include: '#interpolation' },
                { include: '#concept' },
            ],
        };
        textIncludes.push({ include: `#${key}` });
    }

    // A doc. Everything inside is markup, and TokenView.svelte's `:global(.Doc)`
    // rule paints all of it with the doc color — including its words, whose
    // category is `literal` — which is why this is a comment scope and a
    // formatted literal below is a string scope.
    repository['doc'] = {
        name: 'comment.block.documentation.wordplay',
        begin: doc,
        beginCaptures: { '0': { name: edge(commentDelimiter, 'begin') } },
        end: doc,
        endCaptures: { '0': { name: edge(commentDelimiter, 'end') } },
        patterns: [{ include: '#markup-body' }],
    };

    const formattedDelimiter = patternFor(CodeTokenRules, Sym.Formatted);
    const formattedScope = b.scope(Sym.Formatted);
    repository['formatted'] = {
        name: 'string.interpolated.wordplay',
        begin: formattedDelimiter,
        beginCaptures: { '0': { name: edge(formattedScope, 'begin') } },
        end: formattedDelimiter,
        endCaptures: { '0': { name: edge(formattedScope, 'end') } },
        patterns: [{ include: '#markup-body' }],
    };

    // A pattern literal. The `(?=\\)` end branch mirrors the tokenizer: an
    // Example's closing `\` ends the example even when a pattern inside it is
    // still open, so the parser can show the malformed pattern.
    const patternDelimiter = patternFor(
        PatternTokenRules,
        Sym.PatternDelimiter,
    );
    const patternScope = b.scope(Sym.PatternDelimiter);
    repository['pattern'] = {
        name: 'meta.pattern.wordplay',
        begin: patternDelimiter,
        beginCaptures: { '0': { name: edge(patternScope, 'begin') } },
        end: `(${patternDelimiter})|(?=\\\\)`,
        endCaptures: { '1': { name: edge(patternScope, 'end') } },
        patterns: [{ include: '#pattern-body' }],
    };

    // Character references (@amy/cat, @U/1F600) are recognized inside text too.
    repository['concept'] = b.match(ruleFor(MarkupTokenRules, Sym.Concept));

    repository['url'] = {
        name: b.scope(Sym.URL),
        match: toOniguruma(StrictURLRegEx.source),
    };

    // Doubling a markup symbol escapes it, so this must be tried first or a
    // literal `**` opens a bold span.
    repository['markup-escape'] = {
        name: 'constant.character.escape.wordplay',
        match: MarkupSymbols.map(
            (s) => `${escapeRegex(s)}${escapeRegex(s)}`,
        ).join('|'),
    };

    // `\ … \` in markup is an Example: Wordplay code shown inside prose. Its
    // tokens re-assert their own colors over the doc color, which TextMate gives
    // for free since the deepest matching scope wins — the same thing
    // TokenView.svelte's `:global(.Example)` rules do.
    repository['markup-example'] = {
        begin: '\\\\',
        beginCaptures: { '0': { name: edge(codeDelimiter, 'begin') } },
        end: `(\\\\)|(?=${doc})`,
        endCaptures: { '1': { name: edge(codeDelimiter, 'end') } },
        patterns: [{ include: '#code' }],
    };

    // `<description@url>`, gated on the same same-line forward assertion the
    // tokenizer uses, so a lone `<` stays a word.
    const tagOpen = patternFor(MarkupTokenRules, Sym.TagOpen);
    const tagClose = patternFor(MarkupTokenRules, Sym.TagClose);
    repository['markup-link'] = {
        begin: tagOpen,
        beginCaptures: { '0': { name: b.scope(Sym.TagOpen) } },
        end: `(${tagClose})|$`,
        endCaptures: { '1': { name: b.scope(Sym.TagClose) } },
        patterns: [
            {
                match: `(${escapeRegex('@')})([^\\n>＞]*)`,
                captures: {
                    '1': { name: b.scope(Sym.Link) },
                    '2': { name: 'markup.underline.link.wordplay' },
                },
            },
        ],
    };

    // `$mention[a|b]`. The tokenizer tracks "did a mention just end?" as state;
    // a one-character lookbehind is the closest a static grammar gets, so a
    // branch separated from its mention by a line break isn't recognized.
    const listOpen = patternFor(MarkupTokenRules, Sym.ListOpen);
    const listClose = patternFor(MarkupTokenRules, Sym.ListClose);
    repository['markup-branch'] = {
        begin: `(?<=[\\]0-9a-zA-Z?!])(${listOpen})`,
        beginCaptures: { '1': { name: b.scope(Sym.ListOpen) } },
        end: `(${listClose})|${markupBoundary}`,
        endCaptures: { '1': { name: b.scope(Sym.ListClose) } },
        patterns: [
            {
                name: b.scope(Sym.Union),
                match: patternFor(MarkupTokenRules, Sym.Union),
            },
            { include: '#markup-inline' },
        ],
    };

    // The formatting spans. Each begins and ends with the same glyph, so the
    // guards keep a doubled (escaped) glyph from opening one, and the boundary
    // branch pops an unclosed span at the end of its doc or literal.
    if (FormattingSymbols.length !== FormattingSpans.length)
        throw new Error(
            `FormattingSymbols has ${FormattingSymbols.length} entries but FormattingSpans names ${FormattingSpans.length}; name the new formatting symbol in grammar.ts.`,
        );
    const formattingIncludes: Rule[] = [];
    for (const { sym, key } of FormattingSpans) {
        const glyph = escapeRegex(markupGlyph(sym));
        repository[key] = {
            name: b.scope(sym, 'markup'),
            begin: `(?<!${glyph})${glyph}(?!${glyph})`,
            end: `(?<!${glyph})${glyph}(?!${glyph})|${markupBoundary}`,
            patterns: [{ include: '#markup-inline' }],
        };
        formattingIncludes.push({ include: `#${key}` });
    }

    // Code context, in tokenizer order with the delimited values substituted.
    repository['code'] = {
        patterns: [
            { include: '#elision' },
            ...b.walk(
                CodeTokenRules,
                new Map<SymType, Rule[]>([
                    [Sym.Text, textIncludes],
                    [Sym.Code, [{ include: '#interpolation' }]],
                    [Sym.Doc, [{ include: '#doc' }]],
                    [Sym.Formatted, [{ include: '#formatted' }]],
                    [Sym.PatternDelimiter, [{ include: '#pattern' }]],
                    [Sym.Language, [{ include: '#language-tag' }]],
                ]),
                CodeContextSyms,
            ),
        ],
    };

    // Markup context. The tokenizer checks for a URL before its pattern list,
    // and folds doubled symbols into words, so both come first.
    const markupWalk = b.walk(
        MarkupTokenRules,
        new Map<SymType, Rule[]>([
            [Sym.Doc, [{ include: '#doc' }]],
            [Sym.Formatted, [{ include: '#formatted' }]],
            [Sym.Code, [{ include: '#markup-example' }]],
            [Sym.ListOpen, [{ include: '#markup-branch' }]],
            [Sym.TagOpen, [{ include: '#markup-link' }]],
            [Sym.Italic, formattingIncludes],
        ]),
        MarkupContextSyms,
        'markup',
    );
    repository['markup-body'] = {
        patterns: [
            { include: '#markup-escape' },
            { include: '#url' },
            ...markupWalk,
        ],
    };

    // Inside a formatting span, the same rules apply minus the doc and literal
    // delimiters, which belong to the enclosing rule.
    repository['markup-inline'] = {
        patterns: [
            { include: '#markup-escape' },
            { include: '#url' },
            ...markupWalk.filter(
                (rule) =>
                    rule.include !== '#doc' && rule.include !== '#formatted',
            ),
        ],
    };

    repository['pattern-body'] = {
        patterns: b.walk(
            PatternTokenRules,
            new Map<SymType, Rule[]>([
                [Sym.Language, [{ include: '#language-tag' }]],
            ]),
            PatternContextSyms,
        ),
    };

    return {
        grammar: {
            $schema:
                'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
            name: 'Wordplay',
            scopeName: ScopeName,
            fileTypes: ['wp'],
            patterns: [{ include: '#source-header' }, { include: '#code' }],
            repository,
        },
        provenance: b.provenance,
    };
}

/** The complete TextMate grammar document. */
export function buildGrammar(): Record<string, unknown> {
    return build().grammar;
}

/** Every Sym the grammar scopes, and the scopes it gives it. */
export function buildProvenance(): ReadonlyMap<SymType, string[]> {
    return build().provenance;
}

/** Every scope the grammar emits, for the theme-coverage check. */
export function getScopes(): string[] {
    const scopes = new Set<string>();
    const visit = (value: unknown): void => {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value !== null && typeof value === 'object') {
            for (const [key, child] of Object.entries(value)) {
                if (key === 'name' && typeof child === 'string')
                    scopes.add(child);
                else visit(child);
            }
        }
    };
    visit(buildGrammar().repository);
    return [...scopes].sort();
}

/* -------------------------------------------------------------------------- */
/* Language configuration                                                      */
/* -------------------------------------------------------------------------- */

/** VS Code's editing behaviors for `.wp`: comments, brackets, and pairs. */
export function buildLanguageConfiguration(): Record<string, unknown> {
    // Brackets are the delimiters whose open and close glyphs differ, which is
    // exactly the set with a paired close delimiter. The self-toggling ones
    // (`¶`, `` ` ``, `⣿`, `*`, and the text quotes) can't be brackets — VS Code's
    // matcher has to tell an open from a close — but they still auto-close.
    const brackets = Object.entries(DelimiterCloseByOpen).filter(([, close]) =>
        PairedCloseDelimiters.has(close),
    );

    const text = Object.entries(TextCloseByTextOpen);

    const toggling = [
        DOCS_SYMBOL,
        PATTERN_DELIMITER_SYMBOL,
        ELISION_SYMBOL,
    ].map((symbol) => [symbol, symbol]);

    return {
        // Elision is the only comment Wordplay has, so Ctrl+/ toggles it.
        comments: { blockComment: [ELISION_SYMBOL, ELISION_SYMBOL] },
        brackets,
        autoClosingPairs: [
            ...brackets.map(([open, close]) => ({ open, close })),
            ...text.map(([open, close]) => ({
                open,
                close,
                notIn: ['string', 'comment'],
            })),
            ...toggling.map(([open, close]) => ({
                open,
                close,
                notIn: ['string'],
            })),
        ],
        surroundingPairs: [
            ...brackets,
            ...text,
            ...toggling,
            // Selecting a word in a doc and pressing `*` should bold it.
            ...FormattingSymbols.map((symbol) => [symbol, symbol]),
        ],
        // `\` is deliberately absent from every pair above: it opens an
        // interpolation in text and an example in markup, and auto-closing it
        // makes typing the `\\` escape unpleasant.
        wordPattern: NameRegExPattern,
    };
}

/** The exact bytes each generated file should contain. */
export function serializeGrammar(): string {
    return `${JSON.stringify(buildGrammar(), null, 4)}\n`;
}

export function serializeLanguageConfiguration(): string {
    return `${JSON.stringify(buildLanguageConfiguration(), null, 4)}\n`;
}
