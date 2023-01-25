import Token from '@nodes/Token';
import TokenType from '@nodes/TokenType';
import {
    BASE_SYMBOL,
    BIND_SYMBOL,
    BOOLEAN_TYPE_SYMBOL,
    BORROW_SYMBOL,
    CHANGE_SYMBOL,
    CONVERT_SYMBOL,
    DOCS_SYMBOL,
    ETC_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    FALSE_SYMBOL,
    FORMAT_SYMBOL,
    FUNCTION_SYMBOL,
    LANGUAGE_SYMBOL,
    LINK_SYMBOL,
    LIST_CLOSE_SYMBOL,
    LIST_OPEN_SYMBOL,
    MEASUREMENT_SYMBOL,
    NAME_SEPARATOR_SYMBOL,
    NEGATE_SYMBOL,
    NONE_SYMBOL,
    NOT_SYMBOL,
    OR_SYMBOL,
    PLACEHOLDER_SYMBOL,
    PREVIOUS_SYMBOL,
    PRODUCT_SYMBOL,
    PROPERTY_SYMBOL,
    SET_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
    SHARE_SYMBOL,
    STREAM_SYMBOL,
    TABLE_CLOSE_SYMBOL,
    TABLE_OPEN_SYMBOL,
    TAG_CLOSE_SYMBOL,
    TAG_OPEN_SYMBOL,
    TEMPLATE_SYMBOL,
    TRUE_SYMBOL,
    TYPE_CLOSE_SYMBOL,
    TYPE_OPEN_SYMBOL,
    TYPE_SYMBOL,
} from './Symbols';
import TokenList from './TokenList';

const RESERVED_SYMBOLS = [
    TEMPLATE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    LIST_OPEN_SYMBOL,
    LIST_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
    SET_CLOSE_SYMBOL,
    TYPE_OPEN_SYMBOL,
    TYPE_CLOSE_SYMBOL,
    TABLE_OPEN_SYMBOL,
    TABLE_CLOSE_SYMBOL,
    TAG_OPEN_SYMBOL,
    TAG_CLOSE_SYMBOL,
    LINK_SYMBOL,
    FORMAT_SYMBOL,
    BIND_SYMBOL,
    PROPERTY_SYMBOL,
    BASE_SYMBOL,
    FUNCTION_SYMBOL,
    BORROW_SYMBOL,
    SHARE_SYMBOL,
    DOCS_SYMBOL,
    NONE_SYMBOL,
    TYPE_SYMBOL,
    STREAM_SYMBOL,
    PREVIOUS_SYMBOL,
    CONVERT_SYMBOL,
    PLACEHOLDER_SYMBOL,
    ETC_SYMBOL,
    TRUE_SYMBOL,
    FALSE_SYMBOL,
    NOT_SYMBOL,
    LANGUAGE_SYMBOL,
    NAME_SEPARATOR_SYMBOL,
];

const TEXT_SEPARATORS = '\'‘’"“”„«»‹›「」『』';
const UNARY_OPERATORS = `${NOT_SYMBOL}${NEGATE_SYMBOL}`;
const BINARY_OPERATORS = `+\\-×${PRODUCT_SYMBOL}÷%^<≤=≠≥>&|~\?\\u2200-\\u22FF\\u2A00-\\u2AFF\\u2190-\\u21FF\\u27F0-\\u27FF\\u2900-\\u297F`;

export const UnaryOpRegEx = new RegExp(`^[${UNARY_OPERATORS}](?! )`, 'u');
export const BinaryOpRegEx = new RegExp(`^[${BINARY_OPERATORS}]`, 'u');
export const URLRegEx = new RegExp(
    /^https?:\/\/(www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/,
    'u'
);
export const WordsRegEx = new RegExp(
    `^[^\n${EVAL_OPEN_SYMBOL}${EVAL_CLOSE_SYMBOL}${LINK_SYMBOL}${TAG_OPEN_SYMBOL}${TAG_CLOSE_SYMBOL}${FORMAT_SYMBOL}${DOCS_SYMBOL}]+`,
    'u'
);

function escapeRegexCharacter(c: string) {
    return /[\\\/\(\)\[\]\{\}]/.test(c) ? '\\' + c : c;
}

const patterns = [
    { pattern: LIST_OPEN_SYMBOL, types: [TokenType.LIST_OPEN] },
    { pattern: LIST_CLOSE_SYMBOL, types: [TokenType.LIST_CLOSE] },
    { pattern: SET_OPEN_SYMBOL, types: [TokenType.SET_OPEN] },
    { pattern: SET_CLOSE_SYMBOL, types: [TokenType.SET_CLOSE] },
    { pattern: NAME_SEPARATOR_SYMBOL, types: [TokenType.NAME_SEPARATOR] },
    { pattern: LANGUAGE_SYMBOL, types: [TokenType.LANGUAGE] },
    { pattern: `${TABLE_OPEN_SYMBOL}?`, types: [TokenType.SELECT] },
    { pattern: `${TABLE_OPEN_SYMBOL}+`, types: [TokenType.INSERT] },
    { pattern: `${TABLE_OPEN_SYMBOL}-`, types: [TokenType.DELETE] },
    { pattern: `${TABLE_OPEN_SYMBOL}:`, types: [TokenType.UPDATE] },
    { pattern: TABLE_OPEN_SYMBOL, types: [TokenType.TABLE_OPEN] },
    { pattern: TABLE_CLOSE_SYMBOL, types: [TokenType.TABLE_CLOSE] },
    { pattern: BIND_SYMBOL, types: [TokenType.BIND] },
    { pattern: FUNCTION_SYMBOL, types: [TokenType.FUNCTION] },
    { pattern: BORROW_SYMBOL, types: [TokenType.BORROW] },
    { pattern: SHARE_SYMBOL, types: [TokenType.SHARE] },
    { pattern: CONVERT_SYMBOL, types: [TokenType.CONVERT] },
    { pattern: NONE_SYMBOL, types: [TokenType.NONE, TokenType.NONE_TYPE] },
    { pattern: TYPE_SYMBOL, types: [TokenType.TYPE, TokenType.TYPE_OP] },
    { pattern: OR_SYMBOL, types: [TokenType.BINARY_OP, TokenType.UNION] },
    { pattern: TYPE_OPEN_SYMBOL, types: [TokenType.TYPE_OPEN] },
    { pattern: TYPE_CLOSE_SYMBOL, types: [TokenType.TYPE_CLOSE] },
    {
        pattern: TAG_OPEN_SYMBOL,
        types: [TokenType.BINARY_OP, TokenType.TAG_OPEN],
    },
    {
        pattern: TAG_CLOSE_SYMBOL,
        types: [TokenType.BINARY_OP, TokenType.TAG_CLOSE],
    },
    {
        pattern: STREAM_SYMBOL,
        types: [TokenType.REACTION, TokenType.STREAM_TYPE, TokenType.ETC],
    },
    { pattern: CHANGE_SYMBOL, types: [TokenType.CHANGE] },
    { pattern: PREVIOUS_SYMBOL, types: [TokenType.PREVIOUS] },
    { pattern: PLACEHOLDER_SYMBOL, types: [TokenType.PLACEHOLDER] },
    // Roman numerals
    {
        pattern: /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+/,
        types: [TokenType.NUMBER, TokenType.ROMAN],
    },
    // Japanese numbers
    {
        pattern:
            /^[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/u,
        types: [TokenType.NUMBER, TokenType.JAPANESE],
    },
    // Numbers with bases between base 2 and 16
    {
        pattern: /^([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/,
        types: [TokenType.NUMBER, TokenType.BASE],
    },
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    {
        pattern: /^[0-9]+([.,][0-9]+)?%?/,
        types: [TokenType.NUMBER, TokenType.DECIMAL],
    },
    { pattern: /^[.,][0-9]+%?/, types: [TokenType.NUMBER, TokenType.DECIMAL] },
    { pattern: 'π', types: [TokenType.NUMBER, TokenType.PI] },
    { pattern: '∞', types: [TokenType.NUMBER, TokenType.INFINITY] },
    // Must be after numbers, which can have a leading period.
    { pattern: PROPERTY_SYMBOL, types: [TokenType.ACCESS, TokenType.THIS] },
    { pattern: TRUE_SYMBOL, types: [TokenType.BOOLEAN] },
    { pattern: FALSE_SYMBOL, types: [TokenType.BOOLEAN] },
    // Lazily match non-template strings that lack open parentheses and aren't closed with a preceding escape.
    { pattern: /^"[^\\]*?("|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^“[^\\]*?(”|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^„[^\\]*?(“|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^'[^\\]*?('|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^‘[^\\]*?(’|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^‹[^\\]*?(›|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^«[^\\]*?(»|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^「[^\\]*?(」|(?=\n))/u, types: [TokenType.TEXT] },
    { pattern: /^『[^\\]*?(』|(?=\n))/u, types: [TokenType.TEXT] },
    // Lazily match open template strings that aren't opened with a preceding scape.
    { pattern: /^["“„'‘‹«「『].*?(\\|(?=\n))/u, types: [TokenType.TEXT_OPEN] },
    // Lazily match closing strings that don't contain another opening string. This allows betweens to match.
    { pattern: /^\\[^\\]*?("|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    { pattern: /^\\[^\\]*?(”|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    { pattern: /^\\[^\\]*?([']|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    { pattern: /^\\[^\\]*?(’|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    { pattern: /^\\[^\\]*?(›|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    { pattern: /^\\[^\\]*?(»|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    { pattern: /^\\[^\\]*?(」|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    { pattern: /^\\[^\\]*?(』|(?=\n))/u, types: [TokenType.TEXT_CLOSE] },
    // If none of the closed patterns match above, allow a new line to close the text literal.
    { pattern: /^\\[^\\]*?(?=\n)”/u, types: [TokenType.TEXT_CLOSE] },
    // Match this after the eval close to avoid capturing function evaluations in templates.
    { pattern: /^\\.*?\\/u, types: [TokenType.TEXT_BETWEEN] },
    // Finally, catch any leftover single open or close parentheses.
    { pattern: EVAL_OPEN_SYMBOL, types: [TokenType.EVAL_OPEN] },
    { pattern: EVAL_CLOSE_SYMBOL, types: [TokenType.EVAL_CLOSE] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: MEASUREMENT_SYMBOL, types: [TokenType.NUMBER_TYPE] },
    {
        pattern: BOOLEAN_TYPE_SYMBOL,
        types: [TokenType.BOOLEAN_TYPE, TokenType.CONDITIONAL],
    },
    { pattern: '¿', types: [TokenType.BOOLEAN_TYPE, TokenType.CONDITIONAL] },
    // Prefix and infix operators are single Unicode glyphs that are surrounded by whitespace that are not one of the above
    // and one of the following:
    // - Mathematical operators: U+2200..U+22FF
    // - Supplementary operators: U+2A00–U+2AFF
    // - Arrows: U+2190–U+21FF, U+27F0–U+27FF, U+2900–U+297F
    // - Basic latin operators: +-×·÷%^<≤=≠≥>&|
    { pattern: UnaryOpRegEx, types: [TokenType.UNARY_OP] },
    { pattern: BinaryOpRegEx, types: [TokenType.BINARY_OP] },
    { pattern: DOCS_SYMBOL, types: [TokenType.DOC] },
    {
        pattern: new RegExp(`^${LINK_SYMBOL}(?!http)[a-zA-Z]*`),
        types: [TokenType.CONCEPT],
    },
    { pattern: LINK_SYMBOL, types: [TokenType.LINK] },
    { pattern: FORMAT_SYMBOL.repeat(3), types: [TokenType.EXTRA] },
    { pattern: FORMAT_SYMBOL.repeat(2), types: [TokenType.BOLD] },
    { pattern: FORMAT_SYMBOL, types: [TokenType.ITALIC] },

    // All other tokens are names, which are sequences of Unicode glyphs that are not one of the reserved symbols above or whitespace.
    {
        pattern: new RegExp(
            `^[^\n\t ${RESERVED_SYMBOLS.map((s) =>
                escapeRegexCharacter(s)
            ).join('')}${TEXT_SEPARATORS}${BINARY_OPERATORS}]+`,
            'u'
        ),
        types: [TokenType.NAME],
    },
];

export const TEXT_DELIMITERS: Record<string, string> = {
    '"': '"',
    '“': '”',
    '„': '“',
    "'": "'",
    '‘': '’',
    '‹': '›',
    '«': '»',
    '›': '‹',
    '»': '«',
    '「': '」',
    '『': '』',
    '`': '`',
};

export const REVERSE_TEXT_DELIMITERS: Record<string, string> = {};
for (const [open, close] of Object.entries(TEXT_DELIMITERS))
    REVERSE_TEXT_DELIMITERS[close] = open;

export const DELIMITERS: Record<string, string> = {};

// Add the data structure delimiters
DELIMITERS[EVAL_OPEN_SYMBOL] = EVAL_CLOSE_SYMBOL;
DELIMITERS[LIST_OPEN_SYMBOL] = LIST_CLOSE_SYMBOL;
DELIMITERS[SET_OPEN_SYMBOL] = SET_CLOSE_SYMBOL;
DELIMITERS[TYPE_OPEN_SYMBOL] = TYPE_CLOSE_SYMBOL;
DELIMITERS[TABLE_OPEN_SYMBOL] = TABLE_CLOSE_SYMBOL;

// Add the text delimiters.
for (const [open, close] of Object.entries(TEXT_DELIMITERS))
    DELIMITERS[open] = close;

// Construct the reverse delimiters.
export const REVERSE_DELIMITERS: Record<string, string> = {};

for (const [open, close] of Object.entries(DELIMITERS))
    REVERSE_DELIMITERS[close] = open;

export function tokens(source: string): Token[] {
    return tokenize(source).getTokens();
}

export function tokenize(source: string): TokenList {
    // Start with an empty list
    const tokens: Token[] = [];

    // Create a mapping from tokens to space.
    const spaces = new Map<Token, string>();

    // A stack, top at 0, of TEXT_OPEN tokens, helping us decide when to tokenize TEXT_CLOSE.
    const openTemplates: Token[] = [];
    const openEval: Token[] = [];
    let inDoc = false;
    let docEvalDepth: number | undefined = undefined;
    while (source.length > 0) {
        // First read whitespace
        let space = '';

        const tokenizeDocs =
            inDoc &&
            docEvalDepth !== undefined &&
            docEvalDepth === openEval.length;

        // If we're in a doc, then read whitespace starting with newlines only.
        if (tokenizeDocs && !source.startsWith(')')) {
            const spaceMatch = source.match(/^\n[ \t\n]*/);
            space = spaceMatch === null ? '' : spaceMatch[0];
        }
        // If we're not in a doc, then slurp preceding space before the next token.
        else {
            const spaceMatch = source.match(/^[ \t\n]+/);
            space = spaceMatch === null ? '' : spaceMatch[0];
        }

        // Trim the space we found.
        source = source.substring(space.length);

        // Tokenize the next token. We tokenize in documentation mode if we're inside a doc and the eval depth
        // has not changed since we've entered.
        let nextToken = getNextToken(source, openTemplates, tokenizeDocs);

        // Add the token to the list
        tokens.push(nextToken);

        // Save the space for the token.
        if (space !== undefined && space.length > 0)
            spaces.set(nextToken, space);

        // Trim the token off the source.
        source = source.substring(nextToken.text.toString().length);

        // If the token was a text open, push it on the stack.
        if (nextToken.is(TokenType.TEXT_OPEN)) openTemplates.unshift(nextToken);
        // If the token was a close, pop
        else if (nextToken.is(TokenType.TEXT_CLOSE)) openTemplates.shift();

        // If the token was an eval open, push it on the stack.
        if (nextToken.is(TokenType.EVAL_OPEN)) openEval.unshift(nextToken);
        // If the token was a close, pop
        else if (nextToken.is(TokenType.EVAL_CLOSE)) openEval.shift();

        // If we encountered a doc, toggle the flag.
        if (nextToken.is(TokenType.DOC)) {
            if (inDoc) {
                inDoc = false;
                docEvalDepth = undefined;
            } else {
                inDoc = true;
                docEvalDepth = openEval.length;
            }
        }
    }

    // If there's nothing left -- or nothing but space -- and the last token isn't a already end token, add one, and remember the space before it.
    if (tokens.length === 0 || !tokens[tokens.length - 1].is(TokenType.END)) {
        const end = new Token('', TokenType.END);
        tokens.push(end);
        if (source.length > 0) spaces.set(end, source);
    }

    return new TokenList(tokens, spaces);
}

function getNextToken(
    source: string,
    openTemplates: Token[],
    inDoc: boolean
): Token {
    // If there's nothing left after trimming source, return an end of file token.
    if (source.length === 0) return new Token('', TokenType.END);

    // If we're in a doc, special case a few token types that only appear in docs (URL, WORDS)
    if (inDoc) {
        // Check URLs first, since the word regex will match URLs.
        const urlMatch = source.match(URLRegEx);
        if (urlMatch !== null) return new Token(urlMatch[0], TokenType.URL);

        const wordsMatch = source.match(WordsRegEx);
        if (wordsMatch !== null) {
            // Take everything up until two newlines separated only by space.
            const match = wordsMatch[0].split(/\n[ \t]*\n/)[0];
            // Add the preceding space back on, since it's part of the words.
            return new Token(match, TokenType.WORDS);
        }
    }

    // See if one of the global token patterns matches.
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        // If it's a string pattern, just see if the source starts with it.
        if (
            typeof pattern.pattern === 'string' &&
            source.startsWith(pattern.pattern)
        )
            return new Token(pattern.pattern, pattern.types);
        else if (pattern.pattern instanceof RegExp) {
            const match = source.match(pattern.pattern);
            // If we found a match, return it if
            // 1) It's _not_ a text close, or
            // 2) It is, but there are either no open templates (syntax error!), or
            // 3) There is an open template and it's the closing delimiter matches the current open text delimiter.
            if (
                match !== null &&
                (!pattern.types.includes(TokenType.TEXT_CLOSE) ||
                    openTemplates.length === 0 ||
                    match[0].endsWith(
                        TEXT_DELIMITERS[openTemplates[0].getText().charAt(0)]
                    ))
            )
                return new Token(match[0], pattern.types);
        }
    }

    // Otherwise, we fail and return an error token that contains all of the text until the next space.
    let nextSpace = 0;
    for (; nextSpace < source.length; nextSpace++) {
        const char = source.charAt(nextSpace);
        if (char === ' ' || char === '\t' || char === '\n') break;
    }

    // Uh oh, unknown token. This should never be possible, but it probably is, since I haven't proven otherwise.
    return new Token(source.substring(0, nextSpace), TokenType.UNKNOWN);
}
