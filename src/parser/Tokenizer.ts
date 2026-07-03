import { Sym, type SymType } from '@nodes/Sym';
import Token from '@nodes/Token';
import type { KeywordIndex } from '@parser/Keywords';
import { withoutVariationSelectors } from '@unicode/emoji';
import ReservedSymbols from '@parser/ReservedSymbols';
import {
    BIND_SYMBOL,
    BIND_SYMBOL_FULL,
    BOLD_SYMBOL,
    BORROW_SYMBOL,
    CHANGE_SYMBOL,
    CHANGE_SYMBOL2,
    COALESCE_SYMBOL,
    CODE_SYMBOL,
    COMMA_SYMBOL,
    COMMA_SYMBOL_FULL,
    COMMA_SYMBOL_FULL2,
    CONVERT_SYMBOL,
    CONVERT_SYMBOL2,
    CONVERT_SYMBOL3,
    TRANSLATE_SYMBOL,
    TRANSLATE_SYMBOL_RTL,
    DELETE_SYMBOL,
    DIFFERENCE_SYMBOL,
    DOCS_SYMBOL,
    DOT_SYMBOL,
    ELISION_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_CLOSE_SYMBOL_FULL,
    EVAL_OPEN_SYMBOL,
    EVAL_OPEN_SYMBOL_FULL,
    EXPONENT_SYMBOL,
    EXTRA_SYMBOL,
    FALSE_SYMBOL,
    FORMATTED_SYMBOL,
    FORMATTED_SYMBOL_FULL,
    FORMATTED_TYPE_SYMBOL,
    FUNCTION_SYMBOL,
    GLOBE1_SYMBOL,
    GLOBE2_SYMBOL,
    GLOBE3_SYMBOL,
    INITIAL_SYMBOL,
    INSERT_SYMBOL,
    ITALIC_SYMBOL,
    LANGUAGE_SYMBOL,
    LIGHT_SYMBOL,
    LINK_SYMBOL,
    LIST_CLOSE_SYMBOL,
    LIST_CLOSE_SYMBOL_FULL,
    LIST_OPEN_SYMBOL,
    LIST_OPEN_SYMBOL_FULL,
    LITERAL_SYMBOL,
    LITERAL_SYMBOL_FULL,
    MATCH_SYMBOL,
    MEASUREMENT_SYMBOL,
    MENTION_SYMBOL,
    NONE_SYMBOL,
    NOT_SYMBOL,
    OR_SYMBOL,
    PATTERN_AHEAD_SYMBOL,
    PATTERN_ANY_SYMBOL,
    PATTERN_BEHIND_SYMBOL,
    PATTERN_DELIMITER_SYMBOL,
    PATTERN_END_SYMBOL,
    PATTERN_FOLD_SYMBOL,
    PATTERN_LETTER_SYMBOL,
    PATTERN_RANGE_SYMBOL,
    PATTERN_REST_SYMBOL,
    PATTERN_SPACE_SYMBOL,
    PATTERN_START_SYMBOL,
    PATTERN_WORD_SYMBOL,
    PATTERN_WORDEDGE_SYMBOL,
    PLACEHOLDER_SYMBOL,
    PREVIOUS_SYMBOL,
    PRODUCT_SYMBOL,
    PROPERTY_SYMBOL,
    PROPERTY_SYMBOL_FULL,
    THIS_SYMBOL,
    QUESTION_SYMBOL,
    QUESTION_SYMBOL_FULL,
    REMAINDER_SYMBOL,
    SELECT_SYMBOL,
    SET_CLOSE_SYMBOL,
    SET_CLOSE_SYMBOL_FULL,
    SET_OPEN_SYMBOL,
    SET_OPEN_SYMBOL_FULL,
    SHARE_SYMBOL,
    STREAM_SYMBOL,
    STREAM_SYMBOL2,
    SUM_SYMBOL,
    TABLE_CLOSE_SYMBOL,
    TABLE_OPEN_SYMBOL,
    TAG_CLOSE_SYMBOL,
    TAG_CLOSE_SYMBOL_FULL,
    TAG_OPEN_SYMBOL,
    TAG_OPEN_SYMBOL_FULL,
    TRUE_SYMBOL,
    TYPE_CLOSE_SYMBOL,
    TYPE_CLOSE_SYMBOL_FULL,
    TYPE_OPEN_SYMBOL,
    TYPE_OPEN_SYMBOL_FULL,
    TYPE_SYMBOL,
    UNDERSCORE_SYMBOL,
    UPDATE_SYMBOL,
} from '@parser/Symbols';
import TokenList from '@parser/TokenList';
import { toTokens } from '@parser/toTokens';

const TEXT_SEPARATORS = '\'‘’"“”„«»‹›「」『』';
const OPERATORS = `${NOT_SYMBOL}\\-\\^${SUM_SYMBOL}\\${DIFFERENCE_SYMBOL}${PRODUCT_SYMBOL}${DOT_SYMBOL}÷%<≤=≠≥>&|~?\\u2200-\\u22FF\\u2A00-\\u2AFF\\u2190-\\u21FF\\u27F0-\\u27FF\\u2900-\\u297F\\u2315`;

export const OperatorRegEx = new RegExp(`^[${OPERATORS}]`, 'u');
// The dots are escaped: an unescaped `.` would let the pattern greedily swallow a space
// and the following word (e.g. `https://amyjko.com works` as one URL). The dot suffix is
// optional so dotless hosts (e.g. `http://localhost:8080`) still lex as URLs.
const URLRegExPattern =
    /(https?)?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})?\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/;
export const StrictURLRegEx = new RegExp(`^${URLRegExPattern.source}`, 'u');
/** An unanchored matcher for finding a URL inside markup words, so URLs become URL tokens
 * rather than words whose // would be folded as an escaped italic symbol. */
const URLInWordsRegEx = new RegExp(URLRegExPattern.source, 'u');
/** We use this permissive one because we still want to tokenize URL link things, even if they aren't strict. */
export const PermissiveURLRegEx = StrictURLRegEx; //new RegExp(/^(https?)?:\/\/[^>]*/, 'u');

export const MarkupSymbols = [
    CODE_SYMBOL,
    LINK_SYMBOL,
    TAG_OPEN_SYMBOL,
    TAG_OPEN_SYMBOL_FULL,
    TAG_CLOSE_SYMBOL,
    TAG_CLOSE_SYMBOL_FULL,
    ITALIC_SYMBOL,
    UNDERSCORE_SYMBOL,
    BOLD_SYMBOL,
    EXTRA_SYMBOL,
    DOCS_SYMBOL,
    FORMATTED_SYMBOL,
    LIGHT_SYMBOL,
    MENTION_SYMBOL,
    LIST_OPEN_SYMBOL,
    LIST_OPEN_SYMBOL_FULL,
    OR_SYMBOL,
    LIST_CLOSE_SYMBOL,
    LIST_CLOSE_SYMBOL_FULL,
];

export const FormattingSymbols = [
    ITALIC_SYMBOL,
    UNDERSCORE_SYMBOL,
    BOLD_SYMBOL,
    EXTRA_SYMBOL,
    LIGHT_SYMBOL,
];

export function unescapeMarkupSymbols(text: string) {
    return MarkupSymbols.reduce(
        (literal, special) => literal.replaceAll(special + special, special),
        text,
    );
}

/**
 *  Words are any sequence of characters, except unescaped formatting characters and newlines.
 */
export const WordsRegEx = new RegExp(
    `^(${
        // Match any twice repeated formatting characters. Escape formatting characters that have meaning in the regex syntax.
        MarkupSymbols.map((c) => {
            const escape =
                c === CODE_SYMBOL ||
                c === ITALIC_SYMBOL ||
                c === BOLD_SYMBOL ||
                c === EXTRA_SYMBOL ||
                c === MENTION_SYMBOL ||
                c === OR_SYMBOL ||
                c === LIST_OPEN_SYMBOL ||
                c === LIST_CLOSE_SYMBOL
                    ? '\\'
                    : '';
            return `${escape}${c}${escape}${c}|`;
        }).join('')
    }[^\n${
        // Match any non-formatting characters
        MarkupSymbols.map(
            // Escape character class special characters
            (c) =>
                `${
                    c === CODE_SYMBOL ||
                    c === ITALIC_SYMBOL ||
                    c === LIST_OPEN_SYMBOL ||
                    c === LIST_CLOSE_SYMBOL
                        ? '\\'
                        : ''
                }${c}`,
        ).join('')
    }]|${
        // Match tag open symbols that are not links
        `[${TAG_OPEN_SYMBOL}${TAG_OPEN_SYMBOL_FULL}](?!.+${LINK_SYMBOL}.+[${TAG_CLOSE_SYMBOL}${TAG_CLOSE_SYMBOL_FULL}])`
    })+`,
    'u',
);

/** A name is any sequence of characters that is not a reserved symbol, text separator, operator, whitespace, or full-width punctuation. */
export const NameRegExPattern = `[^\n\t ${ReservedSymbols.map((s) =>
    escapeRegexCharacter(s),
).join('')}${TEXT_SEPARATORS}${OPERATORS}]+`;

/** The regex expression prepends a start of string modifier. */
const NameRegEx = new RegExp(`^${NameRegExPattern}`, 'u');

/**
 * Names inside a pattern literal (captures, backrefs, property values) must
 * also stop at the pattern delimiters and atom glyphs, which are not reserved
 * in normal code. So this excludes those in addition to the usual reserved
 * symbols, operators, and text separators.
 */
// The character class (without leading `^[`) of everything that ends a pattern name. Note this
// deliberately excludes PATTERN_FOLD_SYMBOL: fold is written `Aa`, letters which ARE valid name
// characters, so it can't be a name terminator — it's matched as its own bounded token instead.
const PatternNameExclusion = `\n\t ${ReservedSymbols.map((s) =>
    escapeRegexCharacter(s),
).join(
    '',
)}${TEXT_SEPARATORS}${OPERATORS}${PATTERN_DELIMITER_SYMBOL}${PATTERN_ANY_SYMBOL}${PATTERN_LETTER_SYMBOL}${MEASUREMENT_SYMBOL}${PATTERN_SPACE_SYMBOL}${PATTERN_REST_SYMBOL}${PATTERN_WORD_SYMBOL}${PATTERN_WORDEDGE_SYMBOL}${PATTERN_START_SYMBOL}${PATTERN_END_SYMBOL}${PATTERN_AHEAD_SYMBOL}${PATTERN_BEHIND_SYMBOL}${PATTERN_RANGE_SYMBOL}`;
const PatternNameRegEx = new RegExp(`^[^${PatternNameExclusion}]+`, 'u');
// `Aa` (the case-fold keyword) only when it is NOT immediately followed by another name character, so
// a capture/property name like `Aardvark` reads as a single name rather than `Aa` + `rdvark`. Fold is
// always followed by `(` or `/lang`, both of which are name terminators, so this never rejects valid use.
const PatternFoldRegEx = new RegExp(
    `^${PATTERN_FOLD_SYMBOL}(?![^${PatternNameExclusion}])`,
    'u',
);

export function isName(name: string) {
    const tokens = toTokens(name);
    return (
        tokens.nextAre(Sym.Name, Sym.End) && tokens.nextLacksPrecedingSpace()
    );
}

function escapeRegexCharacter(c: string) {
    return /[\\/()[\]{}]/.test(c) ? '\\' + c : c;
}

/** Markup-only tokenization state: the previously emitted token, open mention branch count, and whether a link tag is open. */
type MarkupState = {
    previous: Token | undefined;
    branchDepth: number;
    inTag: boolean;
};

/** A `when` predicate scopes a markup pattern to the context where it has syntactic
 * meaning; outside that context its characters lex as ordinary words. */
type TokenPattern = {
    pattern: string | RegExp;
    types: SymType[];
    when?: (markup: MarkupState) => boolean;
};

const CodePattern = { pattern: CODE_SYMBOL, types: [Sym.Code] };
/** A foreign-language code block in markup: one or more `\<tag>| <code>` variants terminated by a
 * final `\`, e.g. `\py| a = 5\js| let a = 5;\`. The `<tag>|` lead distinguishes it from a Wordplay
 * Example (`\code\`); any lowercase tag is accepted. Captured verbatim, so foreign code never
 * enters the Wordplay tokenizer (it cannot itself contain a `\`). */
const ExternalExamplePattern = {
    pattern: /^\\[a-z]+\|[^\\]*(?:\\[a-z]+\|[^\\]*)*\\/,
    types: [Sym.ExternalExample],
};
const FormattedPattern = {
    pattern: new RegExp(`^[${FORMATTED_SYMBOL}${FORMATTED_SYMBOL_FULL}]`, 'u'),
    types: [Sym.Formatted],
};
const DocPattern = { pattern: DOCS_SYMBOL, types: [Sym.Doc] };
const ListOpenPattern = {
    pattern: new RegExp(
        `^[\\${LIST_OPEN_SYMBOL}${LIST_OPEN_SYMBOL_FULL}]`,
        'u',
    ),
    types: [Sym.ListOpen],
};
const ListClosePattern = {
    pattern: new RegExp(
        `^[\\${LIST_CLOSE_SYMBOL}${LIST_CLOSE_SYMBOL_FULL}]`,
        'u',
    ),
    types: [Sym.ListClose],
};
const TagClosePattern = {
    pattern: new RegExp(`^[${TAG_CLOSE_SYMBOL}${TAG_CLOSE_SYMBOL_FULL}]`, 'u'),
    types: [Sym.TagClose],
};

/** Variable references in markup, for templating and reuse in locales:
 * `$?` or `$!` placeholders, or `$<name>` where name is alphanumeric (no `?`).
 */
export const MentionRegEx = '\\$(?:[?!]|[a-zA-Z0-9]+)';

/** Valid tokens inside of code. */
const CodeTokenPatterns: TokenPattern[] = [
    ListOpenPattern,
    ListClosePattern,
    {
        pattern: new RegExp(
            `^[${SET_OPEN_SYMBOL}{${SET_OPEN_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.SetOpen],
    },
    {
        pattern: new RegExp(
            `^[${SET_CLOSE_SYMBOL}{${SET_CLOSE_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.SetClose],
    },
    {
        pattern: new RegExp(
            `^[${COMMA_SYMBOL}${COMMA_SYMBOL_FULL}${COMMA_SYMBOL_FULL2}]`,
            'u',
        ),
        types: [Sym.Separator],
    },
    { pattern: LANGUAGE_SYMBOL, types: [Sym.Language] },
    { pattern: SELECT_SYMBOL, types: [Sym.Select] },
    { pattern: INSERT_SYMBOL, types: [Sym.Insert] },
    { pattern: DELETE_SYMBOL, types: [Sym.Delete] },
    { pattern: UPDATE_SYMBOL, types: [Sym.Update] },
    { pattern: TABLE_OPEN_SYMBOL, types: [Sym.TableOpen] },
    { pattern: TABLE_CLOSE_SYMBOL, types: [Sym.TableClose] },
    { pattern: PATTERN_DELIMITER_SYMBOL, types: [Sym.PatternDelimiter] },
    {
        pattern: new RegExp(`^[${BIND_SYMBOL}${BIND_SYMBOL_FULL}]`, 'u'),
        types: [Sym.Bind],
    },
    { pattern: FUNCTION_SYMBOL, types: [Sym.Function] },
    { pattern: BORROW_SYMBOL, types: [Sym.Borrow] },
    { pattern: SHARE_SYMBOL, types: [Sym.Share] },
    { pattern: CONVERT_SYMBOL, types: [Sym.Convert] },
    { pattern: CONVERT_SYMBOL2, types: [Sym.Convert] },
    { pattern: CONVERT_SYMBOL3, types: [Sym.Convert] },
    { pattern: TRANSLATE_SYMBOL, types: [Sym.Translate] },
    { pattern: TRANSLATE_SYMBOL_RTL, types: [Sym.Translate] },
    { pattern: NONE_SYMBOL, types: [Sym.None, Sym.None] },
    { pattern: TYPE_SYMBOL, types: [Sym.Type] },
    { pattern: /^!#/, types: [Sym.Number] },
    {
        pattern: new RegExp(`^[${LITERAL_SYMBOL}${LITERAL_SYMBOL_FULL}]`, 'u'),
        types: [Sym.Literal],
    },
    { pattern: OR_SYMBOL, types: [Sym.Operator, Sym.Union] },
    {
        pattern: new RegExp(
            `^[${TYPE_OPEN_SYMBOL}${TYPE_OPEN_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.TypeOpen],
    },
    {
        pattern: new RegExp(
            `^[${TYPE_CLOSE_SYMBOL}${TYPE_CLOSE_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.TypeClose],
    },
    { pattern: STREAM_SYMBOL, types: [Sym.Stream, Sym.Etc] },
    { pattern: STREAM_SYMBOL2, types: [Sym.Stream, Sym.Etc] },
    { pattern: INITIAL_SYMBOL, types: [Sym.Initial] },
    { pattern: CHANGE_SYMBOL, types: [Sym.Change] },
    { pattern: CHANGE_SYMBOL2, types: [Sym.Change] },
    { pattern: PREVIOUS_SYMBOL, types: [Sym.Previous] },
    {
        pattern: PLACEHOLDER_SYMBOL,
        types: [Sym.Placeholder, Sym.LanguageJoin, Sym.Underline],
    },
    // Roman numerals
    {
        pattern: /^-?[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+/,
        types: [Sym.Number, Sym.RomanNumeral],
    },
    // Han (CJK) numerals — covers Chinese, Japanese, and Korean uses of the
    // shared Han character set for numbers, including the larger magnitudes 億 (10^8) and 兆 (10^12).
    {
        pattern:
            /^-?[0-9]*[一二三四五六七八九十百千万億兆]+(・[一二三四五六七八九分厘毛糸忽]+)?/u,
        types: [Sym.Number, Sym.HanNumeral],
    },
    // Thai numerals — positional digits ๐–๙ that read like Arabic decimal.
    {
        pattern: /^-?[๐๑๒๓๔๕๖๗๘๙]+([.,][๐๑๒๓๔๕๖๗๘๙]+)?%?/u,
        types: [Sym.Number, Sym.ThaiNumeral],
    },
    // Bengali numerals (also used by Assamese).
    {
        pattern: /^-?[০১২৩৪৫৬৭৮৯]+([.,][০১২৩৪৫৬৭৮৯]+)?%?/u,
        types: [Sym.Number, Sym.BengaliNumeral],
    },
    // Devanagari numerals (used by Hindi, Marathi, Sanskrit).
    {
        pattern: /^-?[०१२३४५६७८९]+([.,][०१२३४५६७८९]+)?%?/u,
        types: [Sym.Number, Sym.DevanagariNumeral],
    },
    // Gujarati numerals.
    {
        pattern: /^-?[૦૧૨૩૪૫૬૭૮૯]+([.,][૦૧૨૩૪૫૬૭૮૯]+)?%?/u,
        types: [Sym.Number, Sym.GujaratiNumeral],
    },
    // Gurmukhi numerals (used by Punjabi).
    {
        pattern: /^-?[੦੧੨੩੪੫੬੭੮੯]+([.,][੦੧੨੩੪੫੬੭੮੯]+)?%?/u,
        types: [Sym.Number, Sym.GurmukhiNumeral],
    },
    // Kannada numerals.
    {
        pattern: /^-?[೦೧೨೩೪೫೬೭೮೯]+([.,][೦೧೨೩೪೫೬೭೮೯]+)?%?/u,
        types: [Sym.Number, Sym.KannadaNumeral],
    },
    // Tamil numerals.
    {
        pattern: /^-?[௦௧௨௩௪௫௬௭௮௯]+([.,][௦௧௨௩௪௫௬௭௮௯]+)?%?/u,
        types: [Sym.Number, Sym.TamilNumeral],
    },
    // Telugu numerals.
    {
        pattern: /^-?[౦౧౨౩౪౫౬౭౮౯]+([.,][౦౧౨౩౪౫౬౭౮౯]+)?%?/u,
        types: [Sym.Number, Sym.TeluguNumeral],
    },
    // Numbers with bases between base 2 and 16
    {
        pattern: /^-?([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/,
        types: [Sym.Number, Sym.Base],
    },
    // Tokenize Arabic numbers
    { pattern: /^-?[0-9]+([.,][0-9]+)?%?/, types: [Sym.Number, Sym.Decimal] },
    { pattern: /^-?[.,][0-9]+%?/, types: [Sym.Number, Sym.Decimal] },
    // Tokenize π, but don't capture any Greek words that start with π.
    {
        pattern: /^π(?![\u0370-\u03FF\u1F00-\u1FFF])/,
        types: [Sym.Number, Sym.Pi],
    },
    { pattern: /^∞/, types: [Sym.Number, Sym.Infinity] },
    // Must be after numbers, which can have a leading period.
    {
        pattern: new RegExp(
            `^[${PROPERTY_SYMBOL}${PROPERTY_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.Access],
    },
    { pattern: THIS_SYMBOL, types: [Sym.This] },
    { pattern: TRUE_SYMBOL, types: [Sym.Boolean] },
    { pattern: FALSE_SYMBOL, types: [Sym.Boolean] },
    // Match all possible text open and close tokens
    { pattern: '"', types: [Sym.Text] },
    { pattern: '“', types: [Sym.Text] },
    { pattern: '”', types: [Sym.Text] },
    { pattern: '„', types: [Sym.Text] },
    { pattern: "'", types: [Sym.Text] },
    { pattern: '‘', types: [Sym.Text] },
    { pattern: '’', types: [Sym.Text] },
    { pattern: '‹', types: [Sym.Text] },
    { pattern: '›', types: [Sym.Text] },
    { pattern: '«', types: [Sym.Text] },
    { pattern: '»', types: [Sym.Text] },
    { pattern: '「', types: [Sym.Text] },
    { pattern: '」', types: [Sym.Text] },
    { pattern: '『', types: [Sym.Text] },
    { pattern: '』', types: [Sym.Text] },
    // Match code open/close markers
    CodePattern,
    // Finally, catch any leftover single open or close parentheses.
    {
        pattern: new RegExp(
            `^[${EVAL_OPEN_SYMBOL}${EVAL_OPEN_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.EvalOpen],
    },
    {
        pattern: new RegExp(
            `^[${EVAL_CLOSE_SYMBOL}${EVAL_CLOSE_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.EvalClose],
    },
    { pattern: EVAL_CLOSE_SYMBOL_FULL, types: [Sym.EvalClose] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: MEASUREMENT_SYMBOL, types: [Sym.NumberType] },
    { pattern: MATCH_SYMBOL, types: [Sym.Match] },
    { pattern: COALESCE_SYMBOL, types: [Sym.Otherwise] },
    {
        pattern: new RegExp(
            `^[${QUESTION_SYMBOL}${QUESTION_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.BooleanType, Sym.Conditional],
    },
    { pattern: '¿', types: [Sym.BooleanType, Sym.Conditional] },
    { pattern: '-', types: [Sym.Operator, Sym.Region] },
    { pattern: GLOBE1_SYMBOL, types: [Sym.Locale] },
    { pattern: GLOBE2_SYMBOL, types: [Sym.Locale] },
    { pattern: GLOBE3_SYMBOL, types: [Sym.Locale] },
    // Prefix and infix operators are single Unicode characters that are surrounded by whitespace that are not one of the above
    // and one of the following:
    // - Mathematical operators: U+2200..U+22FF
    // - Supplementary operators: U+2A00–U+2AFF
    // - Arrows: U+2190–U+21FF, U+27F0–U+27FF, U+2900–U+297F
    // - Basic latin operators: +-×·÷%^<≤=≠≥>&|
    // These three are operators (so they keep Sym.Operator first), but also carry a
    // second candidate type so unit/type parsing can match them by Sym rather than
    // by operator text. They must precede the generic operator rule to win.
    { pattern: EXPONENT_SYMBOL, types: [Sym.Operator, Sym.Exponent] },
    { pattern: DOT_SYMBOL, types: [Sym.Operator, Sym.Product] },
    { pattern: REMAINDER_SYMBOL, types: [Sym.Operator, Sym.Percent] },
    { pattern: OperatorRegEx, types: [Sym.Operator] },
    { pattern: FORMATTED_TYPE_SYMBOL, types: [Sym.FormattedType] },
    { pattern: '`...`', types: [Sym.FormattedType] },
    FormattedPattern,
    DocPattern,

    // All other tokens are names, which are sequences of Unicode characters that are not one of the reserved symbols above or whitespace.
    { pattern: NameRegEx, types: [Sym.Name] },
];

export const TextCloseByTextOpen: Record<string, string> = {
    '"': '"',
    '“': '”',
    '„': '“',
    "'": "'",
    '‘': '’',
    '‹': '›',
    '«': '»',
    '「': '」',
    '『': '』',
    '`': '`',
};

/**
 * Inside a pattern, a quoted literal is RAW (LANGUAGE.md): the whole
 * `‹open›…‹close›` span is a single {@link Sym.PatternText} token with no markup,
 * no embedded expressions, no `/lang` tag, and no multiple translations — and no
 * escaping (choose a delimiter the text doesn't contain). One closed rule per
 * delimiter, then an unclosed fallback that stops at the pattern close `⣿` or a
 * newline so a missing close doesn't swallow the rest of the pattern.
 */
const PatternTextPatterns: TokenPattern[] = Object.entries(
    TextCloseByTextOpen,
).flatMap(([open, close]) => {
    const o = escapeRegexCharacter(open);
    const c = escapeRegexCharacter(close);
    const stop = escapeRegexCharacter(PATTERN_DELIMITER_SYMBOL);
    return [
        {
            pattern: new RegExp(`^${o}[^${c}]*${c}`, 'u'),
            types: [Sym.PatternText],
        },
        {
            pattern: new RegExp(`^${o}[^${c}${stop}\\n]*`, 'u'),
            types: [Sym.PatternText],
        },
    ];
});

/**
 * Token patterns used only inside a pattern literal ⣿ … ⣿ (see LANGUAGE.md).
 * Inside the pattern body, several glyphs that mean something else in normal
 * code are reinterpreted as pattern atoms/operators (e.g. `_`→letter,
 * `#`→digit, `…`→rest, `~`→complement, `|`→alternation, the inequalities →
 * quantifiers). Raw literal text (`"…"`), names (captures/backrefs/properties),
 * numbers (counts), language tags (`/lang`), sets (`{}`) and groups (`()`)
 * still tokenize with the normal sub-rules. The pattern-specific glyphs come
 * first so they win over the reused code rules.
 */
const PatternTokenPatterns: TokenPattern[] = [
    // The closing ⣿ must win over the reused code/atom rules so it ends the
    // pattern rather than being read as body content.
    { pattern: PATTERN_DELIMITER_SYMBOL, types: [Sym.PatternDelimiter] },
    // An Example span's closing `\` ends the example even when a pattern inside
    // it is still open (`\⣿…\`), the way other delimited values may be left
    // unclosed in markup. `\` is never valid pattern content, so recognizing it
    // here lets the example close (popping the unclosed pattern) so the parser
    // can SHOW the malformed pattern rather than the lexer swallowing the `\`.
    CodePattern,
    { pattern: PATTERN_ANY_SYMBOL, types: [Sym.PatternAny] },
    // `_` is the letter class, but is also the multilingual join inside a `/lang`
    // tag (e.g. `▭/es_en`); parseLanguage only consumes it when directly
    // adjacent, so the two readings don't collide.
    {
        pattern: PATTERN_LETTER_SYMBOL,
        types: [Sym.PatternLetter, Sym.LanguageJoin],
    },
    // `-` is the region subtag separator inside a `/lang` tag (e.g. `en-US`),
    // but also a convenient typed-in alias for the range dash `–`, so `3-5` and
    // `"a"-"z"` work without the en-dash. The parser disambiguates by position:
    // a quantifier/range reads PatternRange, a language tag reads Region.
    { pattern: '-', types: [Sym.PatternRange, Sym.Region] },
    { pattern: MEASUREMENT_SYMBOL, types: [Sym.PatternDigit] },
    { pattern: PATTERN_SPACE_SYMBOL, types: [Sym.PatternSpace] },
    { pattern: PATTERN_REST_SYMBOL, types: [Sym.PatternRest] },
    { pattern: PATTERN_WORD_SYMBOL, types: [Sym.PatternWord] },
    { pattern: PATTERN_WORDEDGE_SYMBOL, types: [Sym.PatternWordEdge] },
    { pattern: PATTERN_START_SYMBOL, types: [Sym.PatternStart] },
    { pattern: PATTERN_END_SYMBOL, types: [Sym.PatternEnd] },
    { pattern: PATTERN_AHEAD_SYMBOL, types: [Sym.PatternAhead] },
    { pattern: PATTERN_BEHIND_SYMBOL, types: [Sym.PatternBehind] },
    { pattern: PatternFoldRegEx, types: [Sym.PatternFold] },
    { pattern: PATTERN_RANGE_SYMBOL, types: [Sym.PatternRange] },
    { pattern: NOT_SYMBOL, types: [Sym.PatternComplement] },
    { pattern: OR_SYMBOL, types: [Sym.PatternAlternation] },
    // Quantifier inequalities; the two-glyph forms come before the one-glyph ones.
    { pattern: '≥', types: [Sym.PatternGreaterEqual] },
    { pattern: '≤', types: [Sym.PatternLessEqual] },
    { pattern: '>', types: [Sym.PatternGreater] },
    { pattern: '<', types: [Sym.PatternLess] },
    { pattern: '=', types: [Sym.PatternEqual] },
    // Reused code sub-rules: language/property slash, capture bind, sets, groups.
    { pattern: LANGUAGE_SYMBOL, types: [Sym.Language] },
    {
        pattern: new RegExp(`^[${BIND_SYMBOL}${BIND_SYMBOL_FULL}]`, 'u'),
        types: [Sym.Bind],
    },
    {
        pattern: new RegExp(
            `^[${SET_OPEN_SYMBOL}${SET_OPEN_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.SetOpen],
    },
    {
        pattern: new RegExp(
            `^[${SET_CLOSE_SYMBOL}${SET_CLOSE_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.SetClose],
    },
    {
        pattern: new RegExp(
            `^[${EVAL_OPEN_SYMBOL}${EVAL_OPEN_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.EvalOpen],
    },
    {
        pattern: new RegExp(
            `^[${EVAL_CLOSE_SYMBOL}${EVAL_CLOSE_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.EvalClose],
    },
    // Raw literal text: each `‹open›…‹close›` span is one PatternText token.
    ...PatternTextPatterns,
    // Counts are non-negative ASCII integers.
    { pattern: /^[0-9]+/, types: [Sym.Number, Sym.Decimal] },
    // Capture, backref, and property names.
    { pattern: PatternNameRegEx, types: [Sym.Name] },
];

/**
 * The glyph to insert to produce each pattern token, keyed by Sym. Most Sym
 * values ARE their glyph, but the pattern glyphs (`|`, `~`, `_`, `#`, `…`, the
 * inequalities, …) are reinterpreted inside `⣿ ⣿` and already name other Syms
 * (`Union`, `Light`, `Placeholder`, …), so their pattern Sym values are unique
 * placeholders like `'pattern.or'`. Autocomplete must insert the real glyph, not
 * the placeholder — otherwise picking "alternation" inserts the literal text
 * `pattern.or`, which can't tokenize. Derived from the single source of truth
 * ({@link PatternTokenPatterns}); string patterns only (regex rules describe
 * character classes, not a single insertable glyph). See PossibleEdits.
 */
export const PatternSymbolGlyphs: ReadonlyMap<SymType, string> = new Map(
    PatternTokenPatterns.flatMap((p) =>
        typeof p.pattern === 'string'
            ? p.types.map((sym): [SymType, string] => [sym, p.pattern as string])
            : [],
    ),
);

/**
 * Multi-codepoint literal token strings the tokenizer recognizes, paired with
 * their primary SymType. Sourced directly from {@link CodeTokenPatterns} so
 * consumers (e.g. UnparsableConflict's merge-anchor inference) work from the
 * tokenizer's ground truth instead of inferring from the Sym enum's value
 * strings — most Sym values match the tokenizer literal, but some are
 * intentional disambiguators (`Sym.BooleanType = '•?'` for the type form of
 * `?`, `Sym.This = '..'` for the this-form of `.`) and one source of truth
 * keeps the repair layer robust to those.
 *
 * Only string patterns are included; regex patterns describe character
 * classes / alternations whose "merged form" isn't a single literal target.
 */
export const LiteralMultiCharTokens: ReadonlyArray<{
    text: string;
    sym: SymType;
}> = CodeTokenPatterns.flatMap((p) =>
    typeof p.pattern === 'string' && Array.from(p.pattern).length >= 2
        ? [{ text: p.pattern, sym: p.types[0] }]
        : [],
);

/**
 * A concept reference starts with a @ then is followed by:
 * 1) one or more names separated by a /
 * 2) a 2-6 digit hexadecimal number, referring to a Unicode codepoint
 * Names can refer to:
 * 1) a uesr interface concept (e.g., @UI/toolbar)
 * 2) a Wordplay programming language concept (e.g., @Bool)
 * 3) a Wordplay type or function (e.g., @Stage, @Stage/color)
 * 4) the globally unique name of a creator-defined character
 */
// A concept link is `@` followed by either a hex codepoint or a name with an
// optional second segment. The separator between the two segments is `.` for a
// concept and its member/subconcept (e.g. `@Color.random`, mirroring property
// access), or `/` for non-concepts: UI references (`@UI/toolbar`), how-tos
// (`@How/...`), and character references (`@username/charactername`). The
// separator must be followed by at least one name character, so a sentence
// period after a link (e.g. `see @Color.`) is left as punctuation.
export const ConceptRegExPattern = `${LINK_SYMBOL}(?!(https?)?://)([0-9a-fA-F]{2,6}(?!${NameRegExPattern})|${NameRegExPattern}([./]${NameRegExPattern})?)`;

/** A global matcher for finding character references inside plain text, so
 *  references (e.g. @amy/cat or @1F600) are tokenized as concept tokens there
 *  too (see #773). */
const ConceptInTextRegEx = new RegExp(ConceptRegExPattern, 'gu');

/** An anchored matcher for a concept link at the start of source. */
const ConceptStartRegEx = new RegExp(`^${ConceptRegExPattern}`, 'u');

/** Characters that make up an email local part. An `@` that directly follows
 *  one of these looks like the boundary in an email address (e.g. the `@` in
 *  jdoe@example.com), so we don't treat such an `@` as a reference unless the
 *  reference is unambiguous (see below). This set is deliberately ASCII-only so
 *  the rule works across all scripts: in languages that don't separate words
 *  with spaces (e.g. Chinese, Japanese, Thai), a reference can directly follow
 *  text — only an ASCII email-like prefix is treated specially. */
const EmailLocalPartChar = /[A-Za-z0-9._%+-]/;

/** Find the next character reference in plain text. Returns its start index and
 *  matched text, or undefined if there is none. A reference is recognized when
 *  it is at a boundary (start of text, after whitespace, after punctuation, or
 *  after non-ASCII text) OR when it uses a `/` separator (e.g. @username/char,
 *  @UI/x). The `/` form disambiguates from email addresses — whose domain never
 *  contains a `/` — so character references work mid-word in Latin scripts too
 *  (e.g. `hi@amy/cat`), while emails like jdoe@example.com stay literal text. */
function findCharacterReference(
    source: string,
): { index: number; text: string } | undefined {
    for (const match of source.matchAll(ConceptInTextRegEx)) {
        const index = match.index ?? 0;
        const preceding = index === 0 ? undefined : source[index - 1];
        // A `@` preceded by another `@` is an escaped literal `@@`, not a
        // reference, so the whole run stays one token for `unescaped` to fold.
        if (preceding === '@') continue;
        if (
            preceding === undefined ||
            !EmailLocalPartChar.test(preceding) ||
            match[0].includes('/')
        )
            return { index, text: match[0] };
    }
    return undefined;
}

/** Contexts within markup where branch and tag delimiters have syntactic meaning. */
const afterMention = (markup: MarkupState) =>
    markup.previous?.isSymbol(Sym.Mention) === true;
const inBranch = (markup: MarkupState) => markup.branchDepth > 0;
const inTag = (markup: MarkupState) => markup.inTag;

/** Valid tokens inside of markup. Patterns with a `when` only match in that context;
 * everywhere else their characters lex as ordinary words via the fallback in getNextToken. */
const MarkupTokenPatterns: TokenPattern[] = [
    DocPattern,
    FormattedPattern,
    // Must precede CodePattern so `\tag| …\` matches as one token rather than a bare `\` Code token.
    ExternalExamplePattern,
    CodePattern,
    // A list open only starts a mention branch when it directly follows a mention.
    { ...ListOpenPattern, when: afterMention },
    { ...ListClosePattern, when: inBranch },
    {
        pattern: ConceptStartRegEx,
        types: [Sym.Concept],
    },
    // The concept reg ex above captures concepts; this captures the @ separating a link's description and URL.
    { pattern: LINK_SYMBOL, types: [Sym.Link], when: inTag },
    { pattern: LANGUAGE_SYMBOL, types: [Sym.Italic] },
    { pattern: LIGHT_SYMBOL, types: [Sym.Light] },
    { pattern: UNDERSCORE_SYMBOL, types: [Sym.Underline] },
    { pattern: BOLD_SYMBOL, types: [Sym.Bold] },
    { pattern: EXTRA_SYMBOL, types: [Sym.Extra] },
    { pattern: new RegExp(`^${MentionRegEx}`, 'u'), types: [Sym.Mention] },
    // Only match an open link if it's followed by ...@...> */
    {
        pattern: new RegExp(
            `^[${TAG_OPEN_SYMBOL}${TAG_OPEN_SYMBOL_FULL}](?=.+${LINK_SYMBOL}.+[${TAG_CLOSE_SYMBOL}${TAG_CLOSE_SYMBOL_FULL}])`,
            'u',
        ),
        types: [Sym.TagOpen],
    },
    { ...TagClosePattern, when: inTag },
    { pattern: OR_SYMBOL, types: [Sym.Union], when: inBranch },
];

export const TextOpenByTextClose: Record<string, string> = {};
for (const [open, close] of Object.entries(TextCloseByTextOpen))
    TextOpenByTextClose[close] = open;

export const TextDelimiters = new Set<string>([
    ...Object.keys(TextOpenByTextClose),
    ...Object.keys(TextCloseByTextOpen),
]);

export const DelimiterCloseByOpen: Record<string, string> = {};

DelimiterCloseByOpen[EVAL_OPEN_SYMBOL] = EVAL_CLOSE_SYMBOL;
DelimiterCloseByOpen[EVAL_OPEN_SYMBOL_FULL] = EVAL_CLOSE_SYMBOL_FULL;
DelimiterCloseByOpen[LIST_OPEN_SYMBOL] = LIST_CLOSE_SYMBOL;
DelimiterCloseByOpen[LIST_OPEN_SYMBOL_FULL] = LIST_CLOSE_SYMBOL_FULL;
DelimiterCloseByOpen[SET_OPEN_SYMBOL] = SET_CLOSE_SYMBOL;
DelimiterCloseByOpen[SET_OPEN_SYMBOL_FULL] = SET_CLOSE_SYMBOL_FULL;
DelimiterCloseByOpen[TYPE_OPEN_SYMBOL] = TYPE_CLOSE_SYMBOL;
DelimiterCloseByOpen[TYPE_OPEN_SYMBOL_FULL] = TYPE_CLOSE_SYMBOL_FULL;
DelimiterCloseByOpen[TABLE_OPEN_SYMBOL] = TABLE_CLOSE_SYMBOL;
// ⣿ closes itself (one toggling delimiter, like a text quote or `\…\` code).
DelimiterCloseByOpen[PATTERN_DELIMITER_SYMBOL] = PATTERN_DELIMITER_SYMBOL;
DelimiterCloseByOpen[CODE_SYMBOL] = CODE_SYMBOL;
DelimiterCloseByOpen[DOCS_SYMBOL] = DOCS_SYMBOL;
DelimiterCloseByOpen[ELISION_SYMBOL] = ELISION_SYMBOL;

export const PairedCloseDelimiters = new Set<string>();
PairedCloseDelimiters.add(EVAL_CLOSE_SYMBOL);
PairedCloseDelimiters.add(EVAL_CLOSE_SYMBOL_FULL);
PairedCloseDelimiters.add(LIST_CLOSE_SYMBOL);
PairedCloseDelimiters.add(LIST_CLOSE_SYMBOL_FULL);
PairedCloseDelimiters.add(SET_CLOSE_SYMBOL);
PairedCloseDelimiters.add(SET_CLOSE_SYMBOL_FULL);
PairedCloseDelimiters.add(TYPE_CLOSE_SYMBOL);
PairedCloseDelimiters.add(TYPE_CLOSE_SYMBOL_FULL);
PairedCloseDelimiters.add(TABLE_CLOSE_SYMBOL);
// ⣿ is intentionally NOT a paired close delimiter — it's self-toggling (its
// open and close are the same glyph), handled like the code/docs self-delimiters.

for (const symbol of FormattingSymbols) DelimiterCloseByOpen[symbol] = symbol;

// Add the text delimiters.
for (const [open, close] of Object.entries(TextCloseByTextOpen))
    DelimiterCloseByOpen[open] = close;

// Construct the reverse delimiters.
export const DelimiterOpenByClose: Record<string, string> = {};

for (const [open, close] of Object.entries(DelimiterCloseByOpen))
    DelimiterOpenByClose[close] = open;

export function tokens(source: string): Token[] {
    return tokenize(source).getTokens();
}

export function tokenize(source: string, keywords?: KeywordIndex): TokenList {
    // First, strip any carriage returns. We only work with line feeds.
    source = source.replaceAll('\r', '');

    // Then, strip any zero width spaces. Those only cause confusion, since they are invisible.
    source = source.replaceAll('\u200B', '');

    // Remove any emoiji variation selectors, as they don't have any semantic meaning.
    source = withoutVariationSelectors(source);

    // Start with an empty list
    const tokens: Token[] = [];

    // Create a mapping from tokens to space.
    const spaces = new Map<Token, string>();

    // Maintain a stack of context tokens, helping us know when we are opening and closing text, docs, and code, as each has different tokenization rules.
    const context: Token[] = [];

    // Track markup-only state: how many mention branches ($name[yes|no]) are open, and whether
    // a web link tag (<description@url>) is open. Branch and tag delimiters only tokenize as
    // delimiters in those contexts; elsewhere they are ordinary words.
    let branchDepth = 0;
    let inTag = false;
    while (source.length > 0) {
        // Initialize possible elisions and preceding space.
        let space = '';

        const container = context.length > 0 && context[0];
        const tokenizingMarkup =
            container &&
            (container.isSymbol(Sym.Doc) || container.isSymbol(Sym.Formatted));

        // If we're in text, don't read any whitespace.
        if (container && container.isSymbol(Sym.Text)) {
            space = '';
        }
        // If we're in a doc, then read whitespace starting with newlines only.
        else if (tokenizingMarkup && !source.startsWith(CODE_SYMBOL)) {
            const spaceMatch = source.match(/^\n[ \t\n]*/);
            space = spaceMatch === null ? '' : spaceMatch[0];
            // A paragraph break ends any open branch or tag; they never span paragraphs.
            if (/\n[ \t]*\n/.test(space)) {
                branchDepth = 0;
                inTag = false;
            }
        }
        // If we're not in a doc, then slurp up elisions and preceding space before the next token.
        else {
            // Read any preceding space.
            space = getNextSpace(source);
        }

        // Trim the space we found.
        source = source.substring(space.length);

        // Tokenize the next token. We tokenize in documentation mode if we're inside a doc and the eval depth
        // has not changed since we've entered.
        const stuff = getNextToken(
            source,
            context,
            { previous: tokens[tokens.length - 1], branchDepth, inTag },
            keywords,
        );

        // Did the next token pull out some unexpected space? Override the space. Apply the elision.
        const nextToken = Array.isArray(stuff) ? stuff[0] : stuff;

        if (Array.isArray(stuff) && stuff[1] !== undefined) {
            const extraSpace = stuff[1];
            source = source.substring(extraSpace.length);
            space = extraSpace;
        }

        // Add the new token to the list
        tokens.push(nextToken);

        // Save the space for the token.
        if (space !== undefined && space.length > 0)
            spaces.set(nextToken, space);

        // Trim the token off the source.
        source = source.substring(nextToken.text.toString().length);

        // Update markup branch and tag state based on the token just emitted.
        if (tokenizingMarkup) {
            if (nextToken.isSymbol(Sym.ListOpen)) branchDepth++;
            else if (nextToken.isSymbol(Sym.ListClose))
                branchDepth = Math.max(0, branchDepth - 1);
            else if (nextToken.isSymbol(Sym.TagOpen)) inTag = true;
            else if (nextToken.isSymbol(Sym.TagClose)) inTag = false;
        }

        // If the token was a code open symbol...
        if (nextToken.isSymbol(Sym.Code)) {
            // Walk down to the nearest Code, skipping an unclosed pattern
            // context (`⣿…`) on the way: a pattern is a lexical mode like text,
            // so an Example span may close (`\`) while a pattern inside it is
            // still open. Closing the example pops that unclosed pattern too,
            // leaving it for the parser to flag (so docs can SHOW a malformed
            // pattern). If no Code is reachable, this `\` opens one instead.
            let codeAt = -1;
            for (let i = 0; i < context.length; i++) {
                if (context[i].isSymbol(Sym.Code)) {
                    codeAt = i;
                    break;
                }
                if (!context[i].isSymbol(Sym.PatternDelimiter)) break;
            }
            if (codeAt >= 0) context.splice(0, codeAt + 1);
            else context.unshift(nextToken);
            // A link tag can't span a code example (its open pattern requires the whole
            // tag on one line of markup), so leaving or entering code closes any open tag.
            // Branch depth is kept: a code example may appear inside a branch's words.
            inTag = false;
        }
        // If the token we encountered a doc...
        else if (nextToken.isSymbol(Sym.Doc)) {
            // Walk down the stack to find the nearest Doc — stopping if we
            // cross a Code (`\…\`) boundary first. If we reach a Doc, this
            // `¶` closes it, and any unclosed Formatted spans on the way are
            // popped alongside it (so a stray backtick inside a localized
            // doc doesn't bleed across the doc boundary into the next
            // entry; see createSayType in vi-VN). If we reach a Code first,
            // we're inside a code example and this `¶` opens a nested doc
            // instead — that's the `\¶inner¶\` case. The walk handles
            // arbitrary doc-inside-code-inside-doc nesting, since each Doc
            // is independent and only the topmost Code blocks the close.
            let closeUntil = -1;
            for (let i = 0; i < context.length; i++) {
                if (context[i].isSymbol(Sym.Code)) break;
                if (context[i].isSymbol(Sym.Doc)) {
                    closeUntil = i;
                    break;
                }
            }
            if (closeUntil >= 0) context.splice(0, closeUntil + 1);
            else context.unshift(nextToken);
            // Branches and tags never span markup boundaries.
            branchDepth = 0;
            inTag = false;
        }
        // If the token we encountered a formatted...
        else if (nextToken.isSymbol(Sym.Formatted)) {
            /// And there's a formatted context open, close it
            if (context.length > 0 && context[0].isSymbol(Sym.Formatted))
                context.shift();
            // Otherwise open one
            else context.unshift(nextToken);
            // Branches and tags never span markup boundaries.
            branchDepth = 0;
            inTag = false;
        }
        // If the token was a text delimiter...
        else if (nextToken.isSymbol(Sym.Text)) {
            // And this closes an open text context, close it
            if (
                context.length > 0 &&
                context[0].isSymbol(Sym.Text) &&
                nextToken.getText() ===
                    TextCloseByTextOpen[context[0].getText()]
            )
                context.shift();
            // Otherwise open one
            else context.unshift(nextToken);
        }
        // A pattern is delimited by a single ⣿ on both ends, so it toggles like
        // a text/code context: if a pattern context is open, this ⣿ closes it;
        // otherwise it opens one (so the body tokenizes with PatternTokenPatterns).
        else if (nextToken.isSymbol(Sym.PatternDelimiter)) {
            if (
                context.length > 0 &&
                context[0].isSymbol(Sym.PatternDelimiter)
            )
                context.shift();
            else context.unshift(nextToken);
        }
    }

    // If there's nothing left -- or nothing but space -- and the last token isn't a already end token, add one, and remember the space before it.
    if (tokens.length === 0 || !tokens[tokens.length - 1].isSymbol(Sym.End)) {
        const end = new Token('', Sym.End);
        tokens.push(end);
        if (source.length > 0) spaces.set(end, source);
    }

    return new TokenList(tokens, spaces);
}

function getNextToken(
    source: string,
    context: Token[],
    markup: MarkupState,
    keywords?: KeywordIndex,
): Token | [Token, string | undefined] {
    // If there's nothing left after trimming source, return an end of file token.
    if (source.length === 0) return new Token('', Sym.End);

    // Any extra space we find a long the way, primarily if we end an unclosed text literal.
    let space: string | undefined = undefined;

    let inMarkup = false;

    if (context.length > 0) {
        const container = context[0];
        // If we're in text, keep reading until the next code open, text close, end of line, or end of source,
        // then make a words token.
        if (container.isSymbol(Sym.Text)) {
            // Find the closest code, text close, end of line, or character reference.
            // For code, we want a standalone code open not preceded or followed by another.
            const codeIndex = source.match(/(?<!\\)\\(?!\\)/)?.index ?? -1;
            const closeIndex = source.indexOf(
                TextCloseByTextOpen[container.getText()],
            );
            const lineIndex = source.indexOf('\n');
            // Custom-character references (e.g. @amy/cat or @1F600) are tokenized as
            // concept tokens inside plain text too (#773), so the parser can build a
            // ConceptLink. We only treat a reference at a word boundary as one (see
            // findCharacterReference). Stop the words token at the next reference, and
            // emit a concept token when the text begins with one.
            const conceptRef = findCharacterReference(source);
            const conceptIndex = conceptRef?.index ?? -1;
            const stopIndex = Math.min(
                codeIndex < 0 ? Number.POSITIVE_INFINITY : codeIndex,
                closeIndex < 0 ? Number.POSITIVE_INFINITY : closeIndex,
                lineIndex < 0 ? Number.POSITIVE_INFINITY : lineIndex,
                conceptIndex < 0 ? Number.POSITIVE_INFINITY : conceptIndex,
            );

            // If we ended this text with a newline, then shift out of the context.
            if (stopIndex === lineIndex) context.shift();

            // If we found some words characters before the next stop, make a words token.
            if (stopIndex > 0)
                return new Token(
                    source.substring(
                        0,
                        stopIndex === Number.POSITIVE_INFINITY
                            ? source.length
                            : stopIndex,
                    ),
                    Sym.Words,
                );
            // If the text begins with a character reference, emit a concept token.
            else if (conceptIndex === 0 && conceptRef)
                return new Token(conceptRef.text, Sym.Concept);
            // Otherwise, read any preceding space for the next token, and tokenize whatever comes next.
            else {
                space = getNextSpace(source);
                source = source.substring(space.length);
                if (source.length === 0) return [new Token('', Sym.End), space];
            }
        }
        // If we're in a doc, special case a few token types that only appear in docs (URL, WORDS)
        else if (
            container.isSymbol(Sym.Doc) ||
            container.isSymbol(Sym.Formatted)
        ) {
            // We're in markup. We'll save this for later if we don't find one of the below.
            inMarkup = true;

            // Check URLs first, since the word regex will match URLs.
            const urlMatch = source.match(PermissiveURLRegEx);
            if (urlMatch !== null) return new Token(urlMatch[0], Sym.URL);

            const wordsMatch = source.match(WordsRegEx);
            if (wordsMatch !== null) {
                // Take everything up until two newlines separated only by space.
                let match = wordsMatch[0].split(/\n[ \t]*\n/)[0];
                // If the words contain a URL, stop the words before it so it lexes as a URL
                // token. The includes check keeps the regex off this hot path for URL-less words.
                if (match.includes('://')) {
                    const url = match.match(URLInWordsRegEx);
                    if (
                        url !== null &&
                        url.index !== undefined &&
                        url.index > 0
                    )
                        match = match.substring(0, url.index);
                }
                if (match.length > 0)
                    // Add the preceding space back on, since it's part of the words.
                    return new Token(match, Sym.Words);
            }
        }
    }

    // Choose a set of patterns to tokenize. Inside a pattern literal ⣿ … ⣿
    // (and not inside a nested text literal), the body uses pattern rules.
    const inPattern =
        context.length > 0 && context[0].isSymbol(Sym.PatternDelimiter);
    const patterns = inMarkup
        ? MarkupTokenPatterns
        : inPattern
          ? PatternTokenPatterns
          : CodeTokenPatterns;

    // See if one of the global token patterns matches.
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        // Skip contextual markup patterns outside their context; their characters
        // lex as ordinary words via the fallback below.
        if (pattern.when !== undefined && !pattern.when(markup)) continue;
        // If it's a string pattern, just see if the source starts with it.
        if (
            typeof pattern.pattern === 'string' &&
            source.startsWith(pattern.pattern)
        )
            return [new Token(pattern.pattern, pattern.types), space];
        else if (pattern.pattern instanceof RegExp) {
            const match = source.match(pattern.pattern);
            // If we found a match, return it if
            // 1) It's _not_ a text close, or
            // 2) It is, but there are either no open templates (syntax error!), or
            // 3) There is an open template and it's the closing delimiter matches the current open text delimiter.
            if (match !== null) {
                // Localized keyword input: when a name-run exactly equals an active keyword word for
                // the current context (code or pattern), lex it as a DUAL-TYPE token carrying both
                // Sym.Name and the keyword's canonical Sym(s). The recursive-descent parser then picks
                // by position — the keyword where the grammar expects one (e.g. ƒ), a plain name
                // elsewhere — so a binding named e.g. `número` still works (it merely shadows the
                // keyword). The typed word is preserved as the token's text. See LANGUAGE.md.
                if (
                    keywords !== undefined &&
                    !inMarkup &&
                    pattern.types.length === 1 &&
                    pattern.types[0] === Sym.Name
                ) {
                    const entry = (
                        inPattern ? keywords.pattern : keywords.code
                    ).get(match[0]);
                    if (entry !== undefined)
                        return [
                            new Token(match[0], [Sym.Name, ...entry.types]),
                            space,
                        ];
                }
                return [new Token(match[0], pattern.types), space];
            }
        }
    }

    // In markup, any character not otherwise recognized is an ordinary word character,
    // so a stray symbol never breaks markup tokenization.
    if (inMarkup) return [new Token(source.substring(0, 1), Sym.Words), space];

    // Otherwise, we fail and return an error token that contains all of the text until the next recognizable token.
    // This is a recursive call: it tries to tokenize the next character, skipping this one, going all the way to the
    // end of the source if necessary, but stopping at the nearest recognizable token. Consume at least one symbol.
    const stuff = getNextToken(source.substring(1), context, markup, keywords);
    const next = Array.isArray(stuff) ? stuff[0] : stuff;
    const end = next.isSymbol(Sym.End)
        ? source.length
        : source.indexOf(next.getText());
    return new Token(source.substring(0, Math.max(end, 1)), Sym.Unknown);
}

/** Find all space and elisions, assuming an arbitrary number of spaces and elisions in sequence before another token is found. */
function getNextSpace(source: string) {
    let index = 0;
    let found = false;
    do {
        const next = source.charAt(index);
        // Is the next character a space, newline, or tab? Eat it.
        if (next === ' ' || next === '\t' || next === '\n') {
            found = true;
            index++;
        }
        // Is the next character an elision? Eat it.
        else if (next === ELISION_SYMBOL) {
            found = true;
            index++;
            while (
                index < source.length &&
                source.charAt(index) !== ELISION_SYMBOL
            )
                index++;
            index++;
        } else {
            found = false;
        }
    } while (index < source.length && found);

    return source.substring(0, index);
}
