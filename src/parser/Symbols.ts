import { withMonoEmoji } from '@unicode/emoji';

export const TYPE_SYMBOL = '•';
export const LITERAL_SYMBOL = '!';
export const LITERAL_SYMBOL_FULL = '！';
export const QUESTION_SYMBOL = '?';
export const QUESTION_SYMBOL_FULL = '？';
export const COALESCE_SYMBOL = '??';
export const MATCH_SYMBOL = '???';
export const TABLE_OPEN_SYMBOL = '⎡';
export const TABLE_CLOSE_SYMBOL = '⎦';
export const INSERT_SYMBOL = `${TABLE_OPEN_SYMBOL}+`;
export const SELECT_SYMBOL = `${TABLE_OPEN_SYMBOL}?`;
export const UPDATE_SYMBOL = `${TABLE_OPEN_SYMBOL}:`;
export const DELETE_SYMBOL = `${TABLE_OPEN_SYMBOL}-`;
export const TAG_OPEN_SYMBOL = '<';
export const TAG_CLOSE_SYMBOL = '>';
export const TAG_OPEN_SYMBOL_FULL = '＜';
export const TAG_CLOSE_SYMBOL_FULL = '＞';
export const CONVERT_SYMBOL = '→';
export const CONVERT_SYMBOL2 = '->';
export const CONVERT_SYMBOL3 = '=>';
export const TRANSLATE_SYMBOL = '↦';
export const TRANSLATE_SYMBOL_RTL = '↤';
export const FUNCTION_SYMBOL = 'ƒ';
export const EVAL_OPEN_SYMBOL = '(';
export const EVAL_CLOSE_SYMBOL = ')';
export const EVAL_OPEN_SYMBOL_FULL = '（';
export const EVAL_CLOSE_SYMBOL_FULL = '）';
export const LANGUAGE_SYMBOL = '/';
export const LIST_OPEN_SYMBOL = '[';
export const LIST_CLOSE_SYMBOL = ']';
export const LIST_OPEN_SYMBOL_FULL = '［';
export const LIST_CLOSE_SYMBOL_FULL = '］';
export const SET_OPEN_SYMBOL = '{';
export const SET_CLOSE_SYMBOL = '}';
export const SET_OPEN_SYMBOL_FULL = '｛';
export const SET_CLOSE_SYMBOL_FULL = '｝';
export const TYPE_OPEN_SYMBOL = '⸨';
export const TYPE_CLOSE_SYMBOL = '⸩';
export const TYPE_OPEN_SYMBOL_FULL = '｟';
export const TYPE_CLOSE_SYMBOL_FULL = '｠';
// Pattern (regular-expression replacement) delimiters, operations, and atoms; see LANGUAGE.md.
// A single ⣿ delimits a pattern on both ends (patterns can't nest), so it toggles
// open/closed like a text quote rather than being a distinct open/close pair.
export const PATTERN_DELIMITER_SYMBOL = '⣿';
export const MATCH_TEST_SYMBOL = '≈';
export const MATCH_SEARCH_SYMBOL = '⌕';
export const PATTERN_ANY_SYMBOL = '◌';
export const PATTERN_LETTER_SYMBOL = '_';
export const PATTERN_SPACE_SYMBOL = '␣';
export const PATTERN_REST_SYMBOL = '…';
export const PATTERN_WORD_SYMBOL = '▭';
export const PATTERN_WORDEDGE_SYMBOL = '┊';
export const PATTERN_START_SYMBOL = '⊢';
export const PATTERN_END_SYMBOL = '⊣';
export const PATTERN_AHEAD_SYMBOL = '▸';
export const PATTERN_BEHIND_SYMBOL = '◂';
// Case-fold is written `Aa` — the one letter-based pattern token, kept universal and unlocalized
// because letter case only exists in bicameral scripts (Latin/Greek/Cyrillic). It can't collide with
// literal text, which is always a quoted span (`"Aa"`), and the tokenizer matches it only when not
// followed by a name character (so a capture like `Aardvark` stays a name). See LANGUAGE.md.
export const PATTERN_FOLD_SYMBOL = 'Aa';
export const PATTERN_RANGE_SYMBOL = '–';
export const BIND_SYMBOL = ':';
export const BIND_SYMBOL_FULL = '：';
export const COMMA_SYMBOL = ',';
export const COMMA_SYMBOL_FULL = '、';
export const COMMA_SYMBOL_FULL2 = '，';
export const MEASUREMENT_SYMBOL = '#';
export const NONE_SYMBOL = 'ø';
export const STREAM_SYMBOL = '…';
export const STREAM_SYMBOL2 = '...';
export const CHANGE_SYMBOL = '∆';
export const CHANGE_SYMBOL2 = '∂';
export const INITIAL_SYMBOL = '◆';
export const PREVIOUS_SYMBOL = '←';
export const TEXT_SYMBOL = "'";
export const ELISION_SYMBOL = '*';
// ⊤⊥
export const TRUE_SYMBOL = '⊤';
export const FALSE_SYMBOL = '⊥';
export const PROPERTY_SYMBOL = '.';
export const PROPERTY_SYMBOL_FULL = '。';
/** The "this" reference: a dotted square, symbolizing a value to be filled in. */
export const THIS_SYMBOL = '⬚';
export const BORROW_SYMBOL = '↓';
export const SHARE_SYMBOL = '↑';
export const DOCS_SYMBOL = '¶';
export const BULLET_SYMBOL = '•';
export const FORMATTED_SYMBOL = '`';
export const FORMATTED_SYMBOL_FULL = '｀';
export const FORMATTED_TYPE_SYMBOL = '`…`';
export const PLACEHOLDER_SYMBOL = '_';
export const ETC_SYMBOL = '…';
export const CODE_SYMBOL = '\\';
export const HIGHLIGHT_SYMBOL = '⭐';
export const BASE_SYMBOL = ';';
export const BASE_SYMBOL_FULL = '；';
export const EXPONENT_SYMBOL = '^';
export const EQUALS_SYMBOL = '=';
export const NOT_EQUALS_SYMBOL = '≠';
export const NEGATE_SYMBOL = '-';
export const AND_SYMBOL = '&';
export const OR_SYMBOL = '|';
export const NOT_SYMBOL = '~';
export const PRODUCT_SYMBOL = '×';
export const DOT_SYMBOL = '·';
export const QUOTIENT_SYMBOL = '÷';
export const REMAINDER_SYMBOL = '%';
export const SUM_SYMBOL = '+';
export const DIFFERENCE_SYMBOL = '-';

export const UNKNOWN_SYMBOL = '⁇';
export const EXCEPTION_SYMBOL = '!!';
export const NEVER_SYMBOL = '🚫';
export const UNPARSABLE_SYMBOL = '🤷🏻‍♀️';
export const SOURCE_SYMBOL = '📄';
export const NATIVE_SYMBOL = '🤫';
export const DEGREE_SYMBOL = '°';
export const EMOJI_SYMBOL = '😀';

export const LINK_SYMBOL = '@';
export const LINK_SYMBOL_FULL = '＠';
export const UNDERSCORE_SYMBOL = '_';
export const ITALIC_SYMBOL = '/';
export const LIGHT_SYMBOL = '~';
export const BOLD_SYMBOL = '*';
export const EXTRA_SYMBOL = '^';
export const MENTION_SYMBOL = '$';

export const LOGO_SYMBOL = '💬';
export const PROJECT_SYMBOL = '📚';
export const PHRASE_SYMBOL = '💬';
export const GROUP_SYMBOL = '🔳';
export const STAGE_SYMBOL = '🎭';
export const PALETTE_SYMBOL = '🎨';
export const DOCUMENTATION_SYMBOL = '📕';
export const COLLABORATE_SYMBOL = '👥';

export const GLOBE1_SYMBOL = '🌎';
export const GLOBE2_SYMBOL = '🌍';
export const GLOBE3_SYMBOL = '🌏';
export const EDIT_SYMBOL = '✎';
export const TOOLTIP_SYMBOL = '💭';
export const CUT_SYMBOL = '✄';
export const COPY_SYMBOL = '📚';
export const PASTE_SYMBOL = '📋';
export const CANCEL_SYMBOL = '⨉';
export const CONFIRM_SYMBOL = '✓';
export const SELECTION_SYMBOL = '⬚';
export const ERASE_SYMBOL = '⌫';

// The "teacher" emoji is a combination of the "person" and "school" emojis.
export const TEACH_SYMBOL = '🏫';
export const LEARN_SYMBOL = '🎓';
export const SYMBOL_SYMBOL = '🙂';
// Discord / community-help link in the page footer.
export const HELP_SYMBOL = '🤝';

export const UNDO_SYMBOL = '⟲';
export const REDO_SYMBOL = '⟳';

/**
 * The symbolic (delimiter) names of the basis types, composed from the constants above so the
 * single source of these characters stays here. Unlike operators and emoji, these can't be
 * detected by a regex (e.g. `ø` is a Unicode letter), so a `Name` consults this set to know it's
 * symbolic — which keeps a concept's word name and delimiter subscript distinct. See Name.isSymbolic.
 */
export const BasisTypeSymbols = new Set<string>([
    `${TEXT_SYMBOL}${TEXT_SYMBOL}`, // ''
    MEASUREMENT_SYMBOL, // #
    NONE_SYMBOL, // ø
    `${TRUE_SYMBOL}${FALSE_SYMBOL}`, // ⊤⊥
    `${LIST_OPEN_SYMBOL}${LIST_CLOSE_SYMBOL}`, // []
    `${SET_OPEN_SYMBOL}${SET_CLOSE_SYMBOL}`, // {}
    `${SET_OPEN_SYMBOL}${BIND_SYMBOL}${SET_CLOSE_SYMBOL}`, // {:}
    `${TABLE_OPEN_SYMBOL}${TABLE_CLOSE_SYMBOL}`, // ⎡⎦
    FORMATTED_TYPE_SYMBOL, // `…`
]);

export const DRAFT_SYMBOL = '🚧';

export const LOCALE_SYMBOL = withMonoEmoji(GLOBE1_SYMBOL);

export const IDEA_SYMBOL = '💡';
export const DEFECT_SYMBOL = '🪲';

export const SEARCH_SYMBOL = '🔍';

export const HOME_SYMBOL = '🏠';

export const BLOCK_EDITING_SYMBOL = withMonoEmoji('🖱️');
export const TEXT_EDITING_SYMBOL = withMonoEmoji('⌨️');

export const DROP_DOWN_SYMBOL = '▾';

export const MACHINE_TRANSLATED_SYMBOL = withMonoEmoji('🤖');
export const LOCALLY_REVISED_SYMBOL = withMonoEmoji('✏️');
export const REVERT_SYMBOL = UNDO_SYMBOL;

export const INFO_SYMBOL = withMonoEmoji('❓');
