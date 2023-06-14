enum TokenType {
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
    Italic = '*',
    Bold = '**',
    Extra = '***',
    Concept = '@concept',
    URL = 'http...',
    ExampleOpen = '⧼',
    ExampleClose = '⧽',

    None = 'ø',
    Type = '•',
    TypeOperator = '•op',
    TypeOpen = '⸨',
    TypeClose = '⸩',
    Separator = ',',
    Language = '/',
    BooleanType = '?',
    NumberType = '#',
    JapaneseNumeral = '#jpn',
    RomanNumeral = '#rom',
    Pi = '#pi',
    Infinity = '∞',
    NoneType = '•ø',
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
    UnaryOperator = 'unary',
    BinaryOperator = 'binary',
    Conditional = 'conditional',

    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    Text = 'text',
    TemplateOpen = 'textopen',
    TemplateBetween = 'textbetween',
    TemplateClose = 'textclose',
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

export default TokenType;
