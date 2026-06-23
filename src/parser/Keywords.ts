import type Token from '@nodes/Token';
import Sym, { type SymType } from '@nodes/Sym';
import {
    AND_SYMBOL,
    BORROW_SYMBOL,
    CHANGE_SYMBOL,
    COALESCE_SYMBOL,
    CONVERT_SYMBOL,
    FALSE_SYMBOL,
    FUNCTION_SYMBOL,
    INITIAL_SYMBOL,
    MATCH_SYMBOL,
    MEASUREMENT_SYMBOL,
    NONE_SYMBOL,
    NOT_SYMBOL,
    OR_SYMBOL,
    PATTERN_AHEAD_SYMBOL,
    PATTERN_ANY_SYMBOL,
    PATTERN_BEHIND_SYMBOL,
    PATTERN_END_SYMBOL,
    PATTERN_LETTER_SYMBOL,
    PATTERN_RANGE_SYMBOL,
    PATTERN_REST_SYMBOL,
    PATTERN_SPACE_SYMBOL,
    PATTERN_START_SYMBOL,
    PATTERN_WORD_SYMBOL,
    PATTERN_WORDEDGE_SYMBOL,
    PREVIOUS_SYMBOL,
    QUESTION_SYMBOL,
    SHARE_SYMBOL,
    STREAM_SYMBOL,
    THIS_SYMBOL,
    TRANSLATE_SYMBOL,
    TRUE_SYMBOL,
    TYPE_SYMBOL,
} from '@parser/Symbols';

/**
 * The canonical, language-neutral identifier for each built-in construct (and the three logical
 * connectives) that can be written and read as a localized word. See LANGUAGE.md for the design.
 *
 * This is the single in-code source of truth for the *structural* facts about each keyword — its
 * canonical glyph and the {@link Sym} type(s) it lexes to. The translatable *words* live per-locale
 * in each locale's `keyword` block (see {@link LocaleText}); this module never holds words.
 */
export type KeywordId =
    | 'function'
    | 'type'
    | 'number'
    | 'none'
    | 'true'
    | 'false'
    | 'borrow'
    | 'share'
    | 'convert'
    | 'translate'
    | 'conditional'
    | 'booleantype'
    | 'otherwise'
    | 'match'
    | 'stream'
    | 'changed'
    | 'initial'
    | 'previous'
    | 'this'
    | 'and'
    | 'or'
    | 'not'
    // Pattern-sublanguage atoms (rendered only inside ⣿ ⣿; see LANGUAGE.md).
    | 'letter'
    | 'digit'
    | 'patternspace'
    | 'patternword'
    | 'any'
    | 'start'
    | 'end'
    | 'rest'
    | 'edge'
    | 'ahead'
    | 'behind'
    | 'range'
    | 'complement'
    | 'alternation';

/** The complete ordered list of keyword ids, for iteration (e.g. the locale verifier). */
export const KeywordIds: KeywordId[] = [
    'function',
    'type',
    'number',
    'none',
    'true',
    'false',
    'borrow',
    'share',
    'convert',
    'translate',
    'conditional',
    'booleantype',
    'otherwise',
    'match',
    'stream',
    'changed',
    'initial',
    'previous',
    'this',
    'and',
    'or',
    'not',
    'letter',
    'digit',
    'patternspace',
    'patternword',
    'any',
    'start',
    'end',
    'rest',
    'edge',
    'ahead',
    'behind',
    'range',
    'complement',
    'alternation',
];

export type KeywordSpec = {
    /** The canonical glyph this keyword is an alias for; the stored, canonical form. */
    symbol: string;
    /** The Sym type(s) the tokenizer emits for the glyph (and for a typed word alias). */
    types: SymType[];
    /** The tokenizer context the keyword applies in. */
    context: 'code' | 'pattern';
    /**
     * True if this keyword is an infix/prefix operator (the three logical connectives). Operator
     * glyphs share Sym types with other uses (e.g. `|` is also a type union), so rendering them as
     * words requires a usage check; see {@link getRenderableKeyword}.
     */
    operator?: boolean;
};

/** The structural map: keyword id → canonical glyph + Sym type(s). Words come from the active locale. */
export const Keywords: Record<KeywordId, KeywordSpec> = {
    function: { symbol: FUNCTION_SYMBOL, types: [Sym.Function], context: 'code' },
    type: { symbol: TYPE_SYMBOL, types: [Sym.Type], context: 'code' },
    number: { symbol: MEASUREMENT_SYMBOL, types: [Sym.NumberType], context: 'code' },
    none: { symbol: NONE_SYMBOL, types: [Sym.None], context: 'code' },
    true: { symbol: TRUE_SYMBOL, types: [Sym.Boolean], context: 'code' },
    false: { symbol: FALSE_SYMBOL, types: [Sym.Boolean], context: 'code' },
    borrow: { symbol: BORROW_SYMBOL, types: [Sym.Borrow], context: 'code' },
    share: { symbol: SHARE_SYMBOL, types: [Sym.Share], context: 'code' },
    convert: { symbol: CONVERT_SYMBOL, types: [Sym.Convert], context: 'code' },
    translate: { symbol: TRANSLATE_SYMBOL, types: [Sym.Translate], context: 'code' },
    conditional: { symbol: QUESTION_SYMBOL, types: [Sym.Conditional], context: 'code' },
    // The `?` glyph is dual-typed: as a TYPE it's BooleanType ("truth"), as an expression it's a
    // Conditional ("then"). Two keywords share the one symbol; the render path picks the word by the
    // token's parent role (see TokenView). Typing either word is unambiguous (distinct Sym types).
    booleantype: { symbol: QUESTION_SYMBOL, types: [Sym.BooleanType], context: 'code' },
    otherwise: { symbol: COALESCE_SYMBOL, types: [Sym.Otherwise], context: 'code' },
    match: { symbol: MATCH_SYMBOL, types: [Sym.Match], context: 'code' },
    stream: { symbol: STREAM_SYMBOL, types: [Sym.Stream], context: 'code' },
    changed: { symbol: CHANGE_SYMBOL, types: [Sym.Change], context: 'code' },
    initial: { symbol: INITIAL_SYMBOL, types: [Sym.Initial], context: 'code' },
    previous: { symbol: PREVIOUS_SYMBOL, types: [Sym.Previous], context: 'code' },
    this: { symbol: THIS_SYMBOL, types: [Sym.This], context: 'code' },
    and: { symbol: AND_SYMBOL, types: [Sym.Operator], context: 'code', operator: true },
    or: { symbol: OR_SYMBOL, types: [Sym.Operator], context: 'code', operator: true },
    not: { symbol: NOT_SYMBOL, types: [Sym.Operator], context: 'code', operator: true },
    // Pattern atoms: dedicated pattern Sym types, so they resolve only inside a pattern (⣿ ⣿).
    letter: { symbol: PATTERN_LETTER_SYMBOL, types: [Sym.PatternLetter], context: 'pattern' },
    digit: { symbol: MEASUREMENT_SYMBOL, types: [Sym.PatternDigit], context: 'pattern' },
    patternspace: { symbol: PATTERN_SPACE_SYMBOL, types: [Sym.PatternSpace], context: 'pattern' },
    patternword: { symbol: PATTERN_WORD_SYMBOL, types: [Sym.PatternWord], context: 'pattern' },
    any: { symbol: PATTERN_ANY_SYMBOL, types: [Sym.PatternAny], context: 'pattern' },
    start: { symbol: PATTERN_START_SYMBOL, types: [Sym.PatternStart], context: 'pattern' },
    end: { symbol: PATTERN_END_SYMBOL, types: [Sym.PatternEnd], context: 'pattern' },
    rest: { symbol: PATTERN_REST_SYMBOL, types: [Sym.PatternRest], context: 'pattern' },
    // Note: case-fold (`Aa`) is intentionally NOT here — it's a universal, unlocalized pattern token
    // (case exists only in bicameral scripts), tokenized directly. See PATTERN_FOLD_SYMBOL.
    edge: { symbol: PATTERN_WORDEDGE_SYMBOL, types: [Sym.PatternWordEdge], context: 'pattern' },
    ahead: { symbol: PATTERN_AHEAD_SYMBOL, types: [Sym.PatternAhead], context: 'pattern' },
    behind: { symbol: PATTERN_BEHIND_SYMBOL, types: [Sym.PatternBehind], context: 'pattern' },
    range: { symbol: PATTERN_RANGE_SYMBOL, types: [Sym.PatternRange], context: 'pattern' },
    complement: { symbol: NOT_SYMBOL, types: [Sym.PatternComplement], context: 'pattern' },
    alternation: { symbol: OR_SYMBOL, types: [Sym.PatternAlternation], context: 'pattern' },
};

/**
 * Resolve a code-context token to the keyword id it canonically represents, or undefined.
 *
 * Construct keywords have dedicated, unambiguous Sym types, so we match by (type, glyph). Booleans
 * share Sym.Boolean, so we disambiguate `true`/`false` by glyph. Operators are intentionally NOT
 * resolved here — their glyphs (`&`, `|`, `~`) share Sym types with type-unions and markup, so
 * rendering them as words needs a parent/usage check handled by the caller.
 */
export function getRenderableKeyword(token: Token): KeywordId | undefined {
    const text = token.getText();
    for (const id of KeywordIds) {
        const spec = Keywords[id];
        if (spec.operator) continue;
        if (text === spec.symbol && spec.types.some((t) => token.isSymbol(t)))
            return id;
    }
    return undefined;
}

/**
 * Keyword Syms whose construct WINS over a name at expression start (via the early atomic checks or
 * the parser-position fix in parseAtomicExpression). A name spelled like one of these is shadowed
 * where it's used as a value or call, so it's worth a (low-severity) advisory. Other keyword
 * collisions — the number type, operators — leave the name fully usable, so we don't warn there.
 */
export const ExpressionStartKeywordSyms: Set<SymType> = new Set([
    Sym.Function,
    Sym.Type,
    Sym.Convert,
    Sym.Boolean,
    Sym.None,
    Sym.This,
    Sym.Initial,
    Sym.Change,
]);

/** The canonical glyph of the first keyword whose construct lexes to `sym`, for advisory messages. */
export function getKeywordGlyph(sym: SymType): string | undefined {
    for (const id of KeywordIds)
        if (Keywords[id].types.includes(sym)) return Keywords[id].symbol;
    return undefined;
}

/**
 * A per-context lookup from a localized keyword word to the canonical Sym type(s) it lexes to. Built
 * once from a set of locales' keyword blocks and handed to the tokenizer to recognize typed words.
 * Partitioned by tokenizer context so a pattern word never shadows a same-spelled code word.
 */
/** What a keyword word lexes to: the canonical Sym type(s), and the canonical glyph (for canonicalizing on copy). */
export type KeywordEntry = { types: SymType[]; symbol: string };

export type KeywordIndex = {
    code: Map<string, KeywordEntry>;
    pattern: Map<string, KeywordEntry>;
};

/**
 * Build a {@link KeywordIndex} from the `keyword` blocks of the program's locales. Annotation
 * prefixes ($~/$?/$!) are stripped; empty/unwritten entries are skipped; on a cross-locale word
 * collision the first locale wins. Takes the bare blocks (not LocaleText) to avoid an import cycle.
 */
export function buildKeywordIndex(
    blocks: ReadonlyArray<Partial<Record<KeywordId, string>>>,
): KeywordIndex {
    const code = new Map<string, KeywordEntry>();
    const pattern = new Map<string, KeywordEntry>();
    for (const block of blocks) {
        for (const id of KeywordIds) {
            const raw = block[id];
            if (typeof raw !== 'string') continue;
            const word = raw.replace(/^\$[~?!]/, '').trim();
            if (word.length === 0) continue;
            const map = Keywords[id].context === 'pattern' ? pattern : code;
            if (!map.has(word))
                map.set(word, {
                    types: Keywords[id].types,
                    symbol: Keywords[id].symbol,
                });
        }
    }
    return { code, pattern };
}

/**
 * Resolve an operator glyph (`&`, `|`, `~`) to its connective keyword id. The caller must first
 * confirm the glyph is being used as an operator (e.g. its parent is a Reference inside a
 * Binary/UnaryEvaluate) rather than as a type union or markup, since those uses share Sym types.
 */
export function getOperatorKeyword(glyph: string): KeywordId | undefined {
    for (const id of KeywordIds) {
        const spec = Keywords[id];
        if (spec.operator && spec.symbol === glyph) return id;
    }
    return undefined;
}
