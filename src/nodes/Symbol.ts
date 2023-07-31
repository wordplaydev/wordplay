enum Symbol {
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

    Doc = '`',
    Words = 'words',
    Link = '@',
    Italic = '/',
    Underline = '_',
    Light = '~',
    Bold = '*',
    Extra = '^',
    Concept = '@concept',
    URL = 'http...',
    ExampleOpen = '⧼',
    ExampleClose = '⧽',
    Mention = '$',
    Branch = '??',

    None = 'ø',
    Type = '•',
    TypeOperator = '•op',
    TypeOpen = '⸨',
    TypeClose = '⸩',
    Separator = ',',
    Language = '/',
    Region = '-',
    BooleanType = '?',
    NumberType = '#',
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
    Previous = '…-',
    Placeholder = '_',
    Etc = '…',
    This = 'this',

    // These are the only operators eligible for unary, binary, or teriary notation.
    // We’ve included them for consistency with math notation and readability.
    Operator = 'binary',
    Conditional = '?',

    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    Text = 'text',
    TemplateOpen = '"\\',
    TemplateBetween = '\\\\',
    TemplateClose = '\\"',
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
    Symbol.Number,
    Symbol.Number,
    Symbol.Decimal,
    Symbol.Name,
    Symbol.Boolean,
    Symbol.Text,
    Symbol.TemplateOpen,
    Symbol.TemplateOpen,
    Symbol.TemplateBetween,
    Symbol.Words,
    Symbol.Concept,
    Symbol.End,
]);

export function isTokenType(text: string): text is Symbol {
    return Object.values(Symbol).includes(text as unknown as Symbol);
}

export default Symbol;
