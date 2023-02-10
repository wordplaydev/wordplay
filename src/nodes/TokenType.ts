enum TokenType {
    EVAL_OPEN = '(',
    EVAL_CLOSE = ')',
    SET_OPEN = '{',
    SET_CLOSE = '}',
    LIST_OPEN = '[',
    LIST_CLOSE = ']',
    TAG_OPEN = '<',
    TAG_CLOSE = '>',
    BIND = ':',
    ACCESS = '.',
    FUNCTION = 'ƒ',
    BORROW = 's',
    SHARE = '↓',
    CONVERT = '→',

    DOC = '`',
    WORDS = 'words',
    LINK = '@',
    ITALIC = '*',
    BOLD = '**',
    EXTRA = '***',
    CONCEPT = '@concept',
    URL = 'http...',

    NONE = 'ø',
    TYPE = '•',
    TYPE_OP = '•op',
    TYPE_OPEN = '⸨',
    TYPE_CLOSE = '⸩',
    NAME_SEPARATOR = ',',
    LANGUAGE = '/',
    BOOLEAN_TYPE = '?',
    NUMBER_TYPE = '#',
    JAPANESE = '#jpn',
    ROMAN = '#rom',
    PI = '#pi',
    INFINITY = '∞',
    NONE_TYPE = '•ø',
    TABLE_OPEN = '⎡',
    TABLE_CLOSE = '⎦',
    SELECT = '⎡=',
    INSERT = '⎡+',
    UPDATE = '⎡:',
    DELETE = '⎡-',
    UNION = '|',
    STREAM = '…',
    CHANGE = '∆',
    INITIAL = '◆',
    PREVIOUS = '…-',
    PLACEHOLDER = '_',
    ETC = '…',
    THIS = 'this',

    // These are the only operators eligible for unary, binary, or teriary notation.
    // We’ve included them for consistency with math notation and readability.
    UNARY_OP = 'unary',
    BINARY_OP = 'binary',
    CONDITIONAL = 'conditional',

    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    TEXT = 'text',
    TEXT_OPEN = 'textopen',
    TEXT_BETWEEN = 'textbetween',
    TEXT_CLOSE = 'textclose',
    // The optional negative sign allows for negative number literals.
    // The optional dash allows for a random number range.
    // The trailing text at the end encodes the unit.
    // Both commas and periods are allowed to cover different conventions globally.
    NUMBER = 'number',
    DECIMAL = 'decimal',
    BASE = 'base',
    BOOLEAN = 'boolean',
    NAME = 'name',
    UNKNOWN = 'unknown',
    END = 'end',
}

export default TokenType;
