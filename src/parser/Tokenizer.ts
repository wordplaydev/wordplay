import Sym from '@nodes/Sym';
import Token from '@nodes/Token';
import ReservedSymbols from './ReservedSymbols';
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
    DELETE_SYMBOL,
    DIFFERENCE_SYMBOL,
    DOCS_SYMBOL,
    ELISION_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_CLOSE_SYMBOL_FULL,
    EVAL_OPEN_SYMBOL,
    EVAL_OPEN_SYMBOL_FULL,
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
    PLACEHOLDER_SYMBOL,
    PREVIOUS_SYMBOL,
    PRODUCT_SYMBOL,
    PROPERTY_SYMBOL,
    PROPERTY_SYMBOL_FULL,
    QUESTION_SYMBOL,
    QUESTION_SYMBOL_FULL,
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
} from './Symbols';
import TokenList from './TokenList';
import { toTokens } from './toTokens';

const TEXT_SEPARATORS = '\'‘’"“”„«»‹›「」『』';
const OPERATORS = `${NOT_SYMBOL}\\-\\^${SUM_SYMBOL}\\${DIFFERENCE_SYMBOL}×${PRODUCT_SYMBOL}÷%<≤=≠≥>&|~?\\u2200-\\u22FF\\u2A00-\\u2AFF\\u2190-\\u21FF\\u27F0-\\u27FF\\u2900-\\u297F`;

export const OperatorRegEx = new RegExp(`^[${OPERATORS}]`, 'u');
export const URLRegEx = new RegExp(
    /^(https?)?:\/\/(www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/,
    'u',
);

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

export function isName(name: string) {
    const tokens = toTokens(name);
    return (
        tokens.nextAre(Sym.Name, Sym.End) && tokens.nextLacksPrecedingSpace()
    );
}

function escapeRegexCharacter(c: string) {
    return /[\\/()[\]{}]/.test(c) ? '\\' + c : c;
}

type TokenPattern = { pattern: string | RegExp; types: Sym[] };

const CodePattern = { pattern: CODE_SYMBOL, types: [Sym.Code] };
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
const ListClosePattern = { pattern: LIST_CLOSE_SYMBOL, types: [Sym.ListClose] };

/** Variable references in markup, for templating and reuse in locales (e.g., $1, $?, $source) */
export const MentionRegEx = '\\$[a-zA-Z0-9?]+';

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
    { pattern: NONE_SYMBOL, types: [Sym.None, Sym.None] },
    { pattern: TYPE_SYMBOL, types: [Sym.Type, Sym.TypeOperator] },
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
    { pattern: PLACEHOLDER_SYMBOL, types: [Sym.Placeholder, Sym.Underline] },
    // Roman numerals
    {
        pattern: /^-?[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+/,
        types: [Sym.Number, Sym.RomanNumeral],
    },
    // Japanese numbers
    {
        pattern:
            /^-?[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/u,
        types: [Sym.Number, Sym.JapaneseNumeral],
    },
    // Numbers with bases between base 2 and 16
    {
        pattern: /^-?([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/,
        types: [Sym.Number, Sym.Base],
    },
    // Tokenize Arabic numbers
    { pattern: /^-?[0-9]+([.,][0-9]+)?%?/, types: [Sym.Number, Sym.Decimal] },
    { pattern: /^-?[.,][0-9]+%?/, types: [Sym.Number, Sym.Decimal] },
    { pattern: /^π/, types: [Sym.Number, Sym.Pi] },
    { pattern: /^∞/, types: [Sym.Number, Sym.Infinity] },
    // Must be after numbers, which can have a leading period.
    {
        pattern: new RegExp(
            `^[${PROPERTY_SYMBOL}${PROPERTY_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.Access, Sym.This],
    },
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
    { pattern: OperatorRegEx, types: [Sym.Operator] },
    { pattern: FORMATTED_TYPE_SYMBOL, types: [Sym.FormattedType] },
    { pattern: '`...`', types: [Sym.FormattedType] },
    FormattedPattern,
    DocPattern,

    // All other tokens are names, which are sequences of Unicode characters that are not one of the reserved symbols above or whitespace.
    { pattern: NameRegEx, types: [Sym.Name] },
];

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
export const ConceptRegExPattern = `${LINK_SYMBOL}(?!(https?)?://)([0-9a-fA-F]{2,6}(?!${NameRegExPattern})|${NameRegExPattern}(/${NameRegExPattern})?)`;

/** Valid tokens inside of markup. */
const MarkupTokenPatterns = [
    DocPattern,
    FormattedPattern,
    CodePattern,
    ListOpenPattern,
    ListClosePattern,
    {
        pattern: new RegExp(`^${ConceptRegExPattern}`, 'u'),
        types: [Sym.Concept],
    },
    // The concept reg ex above captures concepts; this captures any @ part of a link that's not a concept reference.
    { pattern: LINK_SYMBOL, types: [Sym.Link] },
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
    {
        pattern: new RegExp(
            `^[${TAG_CLOSE_SYMBOL}${TAG_CLOSE_SYMBOL_FULL}]`,
            'u',
        ),
        types: [Sym.TagClose],
    },
    { pattern: OR_SYMBOL, types: [Sym.Union] },
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
DelimiterCloseByOpen[CODE_SYMBOL] = CODE_SYMBOL;
DelimiterCloseByOpen[DOCS_SYMBOL] = DOCS_SYMBOL;
DelimiterCloseByOpen[ELISION_SYMBOL] = ELISION_SYMBOL;

export const PairedCloseDelimiters = new Set<string>();
PairedCloseDelimiters.add(EVAL_CLOSE_SYMBOL);
PairedCloseDelimiters.add(LIST_CLOSE_SYMBOL);
PairedCloseDelimiters.add(SET_CLOSE_SYMBOL);
PairedCloseDelimiters.add(TYPE_CLOSE_SYMBOL);
PairedCloseDelimiters.add(TABLE_CLOSE_SYMBOL);

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

export function tokenize(source: string): TokenList {
    // First, strip any carriage returns. We only work with line feeds.
    source = source.replaceAll('\r', '');

    // Then, strip any zero width spaces. Those only cause confusion, since they are invisible.
    source = source.replaceAll('\u200B', '');

    // Start with an empty list
    const tokens: Token[] = [];

    // Create a mapping from tokens to space.
    const spaces = new Map<Token, string>();

    // Maintain a stack of context tokens, helping us know when we are opening and closing text, docs, and code, as each has different tokenization rules.
    const context: Token[] = [];
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
        const stuff = getNextToken(source, context);

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

        // If the token was a code open symbol...
        if (nextToken.isSymbol(Sym.Code)) {
            // And there's a code context open, close it
            if (context.length > 0 && context[0].isSymbol(Sym.Code))
                context.shift();
            // Otherwise open one.
            else context.unshift(nextToken);
        }
        // If the token we encountered a doc...
        else if (nextToken.isSymbol(Sym.Doc)) {
            /// And there's a doc context open, close it
            if (context.length > 0 && context[0].isSymbol(Sym.Doc))
                context.shift();
            // Otherwise open one
            else context.unshift(nextToken);
        }
        // If the token we encountered a formatted...
        else if (nextToken.isSymbol(Sym.Formatted)) {
            /// And there's a doc context open, close it
            if (context.length > 0 && context[0].isSymbol(Sym.Formatted))
                context.shift();
            // Otherwise open one
            else context.unshift(nextToken);
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
            // Find the closest code, text close, or end of line
            // For code, we want a standalone code open not preceded or followed by another.
            const codeIndex = source.match(/(?<!\\)\\(?!\\)/)?.index ?? -1;
            const closeIndex = source.indexOf(
                TextCloseByTextOpen[container.getText()],
            );
            const lineIndex = source.indexOf('\n');
            const stopIndex = Math.min(
                codeIndex < 0 ? Number.POSITIVE_INFINITY : codeIndex,
                closeIndex < 0 ? Number.POSITIVE_INFINITY : closeIndex,
                lineIndex < 0 ? Number.POSITIVE_INFINITY : lineIndex,
            );

            // If we ended this text with a newline, then shift out of the context.
            if (stopIndex === lineIndex) context.shift();

            // If we found more than one words characters, make a word token for the text.
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
            const urlMatch = source.match(URLRegEx);
            if (urlMatch !== null) return new Token(urlMatch[0], Sym.URL);

            const wordsMatch = source.match(WordsRegEx);
            if (wordsMatch !== null) {
                // Take everything up until two newlines separated only by space.
                const match = wordsMatch[0].split(/\n[ \t]*\n/)[0];
                // Add the preceding space back on, since it's part of the words.
                return new Token(match, Sym.Words);
            }
        }
    }

    // Choose a set of patterns to tokenize.
    const patterns = inMarkup ? MarkupTokenPatterns : CodeTokenPatterns;

    // See if one of the global token patterns matches.
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
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
            if (match !== null)
                return [new Token(match[0], pattern.types), space];
        }
    }

    // Otherwise, we fail and return an error token that contains all of the text until the next recognizable token.
    // This is a recursive call: it tries to tokenize the next character, skipping this one, going all the way to the
    // end of the source if necessary, but stopping at the nearest recognizable token. Consume at least one symbol.
    const stuff = getNextToken(source.substring(1), context);
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
