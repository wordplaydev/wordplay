import {
    BIND_SYMBOL,
    BORROW_SYMBOL,
    CHANGE_SYMBOL,
    COMMA_SYMBOL,
    CONVERT_SYMBOL,
    DIFFERENCE_SYMBOL,
    DOCS_SYMBOL,
    ETC_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    EXCEPTION_SYMBOL,
    EXPONENT_SYMBOL,
    FUNCTION_SYMBOL,
    INITIAL_SYMBOL,
    LANGUAGE_SYMBOL,
    LINK_SYMBOL,
    LIST_CLOSE_SYMBOL,
    LIST_OPEN_SYMBOL,
    MEASUREMENT_SYMBOL,
    NATIVE_SYMBOL,
    NEVER_SYMBOL,
    NONE_SYMBOL,
    OR_SYMBOL,
    PLACEHOLDER_SYMBOL,
    PREVIOUS_SYMBOL,
    PROPERTY_SYMBOL,
    QUESTION_SYMBOL,
    SET_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
    SOURCE_SYMBOL,
    STREAM_SYMBOL,
    SUM_SYMBOL,
    TABLE_CLOSE_SYMBOL,
    TABLE_OPEN_SYMBOL,
    TYPE_CLOSE_SYMBOL,
    TYPE_OPEN_SYMBOL,
    TYPE_SYMBOL,
    UNKNOWN_SYMBOL,
    UNPARSABLE_SYMBOL,
} from '@parser/Symbols';
import type Glyph from './Glyph';
import Emotion from './Emotion';

const GlyphSet = {
    // Parsing
    Unparsable: {
        symbols: UNPARSABLE_SYMBOL,
        emotion: Emotion.Confused,
    },
    Source: {
        symbols: SOURCE_SYMBOL,
        emotion: Emotion.Excited,
    },
    // Names
    Language: {
        symbols: LANGUAGE_SYMBOL,
        emotion: Emotion.Excited,
    },
    Name: {
        symbols: COMMA_SYMBOL,
        emotion: Emotion.Cheerful,
    },
    Reference: {
        symbols: PROPERTY_SYMBOL,
        emotion: Emotion.Cheerful,
    },
    Bind: {
        symbols: BIND_SYMBOL,
        emotion: Emotion.Cheerful,
    },
    This: {
        symbols: PROPERTY_SYMBOL,
        emotion: Emotion.Cheerful,
    },
    Native: {
        symbols: NATIVE_SYMBOL,
        emotion: Emotion.Serious,
    },
    Borrow: {
        symbols: BORROW_SYMBOL,
        emotion: Emotion.Shy,
    },
    // Functions
    Function: {
        symbols: FUNCTION_SYMBOL,
        emotion: Emotion.Kind,
    },
    Evaluate: {
        symbols: PLACEHOLDER_SYMBOL + EVAL_OPEN_SYMBOL + EVAL_CLOSE_SYMBOL,
        emotion: Emotion.Cheerful,
    },
    Conditional: {
        symbols: QUESTION_SYMBOL,
        emotion: Emotion.Curious,
    },
    Conversion: {
        symbols: CONVERT_SYMBOL,
        emotion: Emotion.Cheerful,
    },
    Insert: {
        symbols: TABLE_OPEN_SYMBOL + SUM_SYMBOL,
        emotion: Emotion.Sorry,
    },
    Select: {
        symbols: TABLE_OPEN_SYMBOL + QUESTION_SYMBOL,
        emotion: Emotion.Curious,
    },
    Update: {
        symbols: TABLE_OPEN_SYMBOL + BIND_SYMBOL,
        emotion: Emotion.Loving,
    },
    Delete: {
        symbols: TABLE_OPEN_SYMBOL + DIFFERENCE_SYMBOL,
        emotion: Emotion.Annoyed,
    },
    // Types
    Type: {
        symbols: TYPE_SYMBOL,
        emotion: Emotion.Kind,
    },
    Bool: {
        symbols: QUESTION_SYMBOL,
        emotion: Emotion.Kind,
    },
    None: {
        symbols: NONE_SYMBOL,
        emotion: Emotion.Kind,
    },
    Measurement: {
        symbols: MEASUREMENT_SYMBOL,
        emotion: Emotion.Kind,
    },
    List: {
        symbols: LIST_OPEN_SYMBOL + LIST_CLOSE_SYMBOL,
        emotion: Emotion.Kind,
    },
    Set: {
        symbols: SET_OPEN_SYMBOL + SET_CLOSE_SYMBOL,
        emotion: Emotion.Kind,
    },
    Table: {
        symbols: TABLE_OPEN_SYMBOL + TABLE_CLOSE_SYMBOL,
        emotion: Emotion.Kind,
    },
    Dimension: {
        symbols: EXPONENT_SYMBOL,
        emotion: Emotion.Serious,
    },
    Placeholder: {
        symbols: PLACEHOLDER_SYMBOL,
        emotion: Emotion.Sad,
    },
    Never: {
        symbols: NEVER_SYMBOL,
        emotion: Emotion.Kind,
    },
    Unknown: {
        symbols: UNKNOWN_SYMBOL,
        emotion: Emotion.Kind,
    },
    Union: {
        symbols: OR_SYMBOL,
        emotion: Emotion.Kind,
    },
    VariableType: {
        symbols: TYPE_OPEN_SYMBOL + TYPE_CLOSE_SYMBOL,
        emotion: Emotion.Kind,
    },
    Exception: {
        symbols: EXCEPTION_SYMBOL,
        emotion: Emotion.Kind,
    },
    // Input
    Stream: {
        symbols: STREAM_SYMBOL,
        emotion: Emotion.Restless,
    },
    Previous: {
        symbols: PREVIOUS_SYMBOL,
        emotion: Emotion.Kind,
    },
    Change: {
        symbols: CHANGE_SYMBOL,
        emotion: Emotion.Kind,
    },
    Initial: {
        symbols: INITIAL_SYMBOL,
        emotion: Emotion.Kind,
    },
    // Documentation
    Doc: {
        symbols: DOCS_SYMBOL,
        emotion: Emotion.Kind,
    },
    Link: {
        symbols: LINK_SYMBOL,
        emotion: Emotion.Kind,
    },
    Words: {
        symbols: ETC_SYMBOL,
        emotion: Emotion.Kind,
    },
    Paragraph: {
        symbols: '¶',
        emotion: Emotion.Kind,
    },
} as const;

// A little TypeScript hackery to type based on the keys of the literal above.
const Glyphs: Readonly<Record<keyof typeof GlyphSet, Readonly<Glyph>>> =
    GlyphSet;

export default Glyphs;
