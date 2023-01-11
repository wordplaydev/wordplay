enum TokenType {
    EVAL_OPEN,
    EVAL_CLOSE,
    SET_OPEN,
    SET_CLOSE,
    LIST_OPEN,
    LIST_CLOSE,
    TAG_OPEN,
    TAG_CLOSE,
    BIND,
    ACCESS,
    FUNCTION,
    BORROW,
    SHARE,
    CONVERT,

    DOC,
    WORDS,
    LINK,
    ITALIC,
    BOLD,
    EXTRA,
    CONCEPT,
    URL,

    NONE,
    TYPE,
    TYPE_OP,
    TYPE_OPEN,
    TYPE_CLOSE,
    NAME_SEPARATOR,
    LANGUAGE,
    BOOLEAN_TYPE,
    NUMBER_TYPE,
    JAPANESE,
    ROMAN,
    PI,
    INFINITY,
    NONE_TYPE,
    TABLE_OPEN,
    TABLE_CLOSE,
    SELECT,
    INSERT,
    UPDATE,
    DELETE,
    UNION,
    REACTION,
    CHANGE,
    STREAM_TYPE,
    PREVIOUS,
    PLACEHOLDER,
    ETC,
    THIS,

    // These are the only operators eligible for unary, binary, or teriary notation.
    // We’ve included them for consistency with math notation and readability.
    UNARY_OP,
    BINARY_OP,
    CONDITIONAL,

    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    TEXT,
    TEXT_OPEN,
    TEXT_BETWEEN,
    TEXT_CLOSE,
    // The optional negative sign allows for negative number literals.
    // The optional dash allows for a random number range.
    // The trailing text at the end encodes the unit.
    // Both commas and periods are allowed to cover different conventions globally.
    NUMBER,
    DECIMAL,
    BASE,
    BOOLEAN,
    NAME,
    UNKNOWN,
    END,
}

export default TokenType;
