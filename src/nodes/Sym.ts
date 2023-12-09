enum Sym {
    EvalOpen = '(',
    EvalClose = ')',
    SetOpen = '{',
    SetClose = '}',
    ListOpen = '[',
    ListClose = ']',
    TagOpen = '<',
    TagClose = '>',
    Bind = ':',
    Access = '.',
    Function = 'ƒ',
    Borrow = '↓',
    Share = '↑',
    Convert = '→',
    Placeholder = '_',

    Doc = '``',
    Formatted = '`',
    FormattedType = '`…`',
    Words = 'words',
    Link = '@',
    Italic = '//',
    Underline = '__',
    Light = '~~',
    Bold = '**',
    Extra = '^^',
    Concept = '@concept',
    URL = 'http...',
    Mention = '$',

    None = 'ø',
    Type = '•',
    Literal = '!',
    TypeOperator = '•op',
    TypeOpen = '⸨',
    TypeClose = '⸩',
    Separator = ',',
    Language = '/',
    Region = '-',
    BooleanType = '•?',
    NumberType = '•#',
    JapaneseNumeral = '#jpn',
    RomanNumeral = '#rom',
    Pi = '#pi',
    Infinity = '∞',
    TableOpen = '⎡',
    TableClose = '⎦',
    Select = '⎡=',
    Insert = '⎡+',
    Update = '⎡:',
    Delete = '⎡-',
    Union = '|',
    Stream = '…',
    Change = '∆',
    Initial = '◆',
    Previous = '←',
    Etc = '...',
    This = '..',
    Locale = '🌏',

    // These are the only operators eligible for unary, binary, or teriary notation.
    // We’ve included them for consistency with math notation and readability.
    Operator = 'operator',
    Otherwise = '??',
    Conditional = '?',

    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    Text = 'text',
    Code = '\\',
    // The optional negative sign allows for negative number literals.
    // The optional dash allows for a random number range.
    // The trailing text at the end encodes the unit.
    // Both commas and periods are allowed to cover different conventions globally.
    Number = 'number',
    Decimal = 'decimal',
    Base = 'base',
    Boolean = 'boolean',
    Name = 'name',
    Unknown = 'unknown',
    End = 'end',
}

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
    Sym.End,
]);

export function isTokenType(text: string): text is Sym {
    return Object.values(Sym).includes(text as unknown as Sym);
}

export default Sym;
