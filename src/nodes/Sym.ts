const Sym = {
    EvalOpen: '(',
    EvalClose: ')',
    SetOpen: '{',
    SetClose: '}',
    ListOpen: '[',
    ListClose: ']',
    TagOpen: '<',
    TagClose: '>',
    Bind: ':',
    Access: '.',
    Function: 'ƒ',
    Borrow: '↓',
    Share: '↑',
    Convert: '→',
    Translate: '↦',
    Placeholder: '_',

    Doc: '¶',
    Formatted: '`',
    FormattedType: '`…`',
    Words: 'words',
    Link: '@',
    Italic: '/',
    Underline: '_',
    Light: '~',
    Bold: '*',
    Extra: '^',
    Concept: '@concept',
    URL: 'http...',
    Mention: '$',

    None: 'ø',
    Type: '•',
    Literal: '!',
    TypeOpen: '⸨',
    TypeClose: '⸩',
    Separator: ',',
    Language: '/',
    LanguageJoin: '_',
    Region: '-',
    BooleanType: '•?',
    NumberType: '•#',
    HanNumeral: '#han',
    RomanNumeral: '#rom',
    ThaiNumeral: '#tha',
    BengaliNumeral: '#ben',
    DevanagariNumeral: '#dev',
    GujaratiNumeral: '#guj',
    GurmukhiNumeral: '#gur',
    KannadaNumeral: '#kan',
    TamilNumeral: '#tam',
    TeluguNumeral: '#tel',
    Pi: 'π',
    Infinity: '∞',
    TableOpen: '⎡',
    TableClose: '⎦',
    Select: '⎡?',
    Insert: '⎡+',
    Update: '⎡:',
    Delete: '⎡-',
    Union: '|',
    // These three are also operators (kept first in their token's type list), but
    // carry a second candidate type so unit/type parsing can match them by Sym
    // rather than by operator text, the same way `|` is also Sym.Union.
    Exponent: '^',
    Product: '·',
    Percent: '%',
    Stream: '…',
    Change: '∆',
    Initial: '◆',
    Previous: '←',
    Etc: '...',
    This: '⬚',
    Locale: '🌏',

    // Pattern (regex replacement) tokens; the body tokens are emitted only inside ⣿ ⣿ by the pattern lexer context. See LANGUAGE.md.
    // A pattern is delimited by a single ⣿ on both ends (it can't nest), so one
    // toggling symbol opens and closes, like a text quote.
    PatternDelimiter: '⣿',
    PatternAny: '◌',
    PatternLetter: 'pattern.letter',
    PatternDigit: 'pattern.digit',
    PatternSpace: '␣',
    PatternRest: 'pattern.rest',
    PatternWord: '▭',
    PatternWordEdge: '┊',
    PatternStart: '⊢',
    PatternEnd: '⊣',
    PatternAhead: '▸',
    PatternBehind: '◂',
    PatternFold: 'Aa',
    PatternRange: '–',
    PatternComplement: 'pattern.not',
    PatternAlternation: 'pattern.or',
    PatternSlash: 'pattern.slash',
    PatternEqual: 'pattern.eq',
    PatternGreater: 'pattern.gt',
    PatternGreaterEqual: 'pattern.gte',
    PatternLess: 'pattern.lt',
    PatternLessEqual: 'pattern.lte',
    /** A raw literal inside a pattern (`"…"`), tokenized whole with no markup. */
    PatternText: 'pattern.text',

    // These are the only operators eligible for unary, binary, or teriary notation.
    // We've included them for consistency with math notation and readability.
    Operator: 'operator',
    Conditional: '?',
    Otherwise: '??',
    Match: '???',

    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    Text: 'text',
    Code: '\\',
    /** A markup block of foreign-language code, e.g. `\py| a = 5\js| let a = 5;\` */
    ExternalExample: '@ext',
    Highlight: '⭐',
    // The optional negative sign allows for negative number literals.
    // The optional dash allows for a random number range.
    // The trailing text at the end encodes the unit.
    // Both commas and periods are allowed to cover different conventions globally.
    Number: 'number',
    Decimal: 'decimal',
    Base: 'base',
    Boolean: 'boolean',
    Name: 'name',
    Unknown: 'unknown',
    End: 'end',
} as const;

export type SymType = (typeof Sym)[keyof typeof Sym];

/** Tokens that can be many different possible sequences of characters. We use this list to know when a token is static and can only be one symbol. */
export const WildcardSymbols = new Set([
    Sym.Number,
    Sym.Number,
    Sym.Decimal,
    Sym.Name,
    Sym.Boolean,
    Sym.Text,
    Sym.Words,
    Sym.Concept,
    Sym.ExternalExample,
    Sym.End,
]);

export function isTokenType(text: string): text is SymType {
    return (Object.values(Sym) as string[]).includes(text);
}

export { Sym };
export default Sym;
