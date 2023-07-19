import Token from '@nodes/Token';
import TokenType from '@nodes/TokenType';
import {
    BIND_SYMBOL,
    QUESTION_SYMBOL,
    BORROW_SYMBOL,
    CHANGE_SYMBOL,
    CONVERT_SYMBOL,
    DOCS_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    FALSE_SYMBOL,
    FUNCTION_SYMBOL,
    LANGUAGE_SYMBOL,
    LINK_SYMBOL,
    LIST_CLOSE_SYMBOL,
    LIST_OPEN_SYMBOL,
    MEASUREMENT_SYMBOL,
    COMMA_SYMBOL,
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
    TRUE_SYMBOL,
    TYPE_CLOSE_SYMBOL,
    TYPE_OPEN_SYMBOL,
    TYPE_SYMBOL,
    INITIAL_SYMBOL,
    SUM_SYMBOL,
    DIFFERENCE_SYMBOL,
    EXAMPLE_OPEN_SYMBOL,
    EXAMPLE_CLOSE_SYMBOL,
    ITALIC_SYMBOL,
    UNDERSCORE_SYMBOL,
    BOLD_SYMBOL,
    EXTRA_SYMBOL,
    MENTION_SYMBOL,
    CONVERT_SYMBOL2,
    CONVERT_SYMBOL3,
    STREAM_SYMBOL2,
} from './Symbols';
import TokenList from './TokenList';
import ConceptRegEx from './ConceptRegEx';
import ReservedSymbols from './ReservedSymbols';

const TEXT_SEPARATORS = '\'‘’"“”„«»‹›「」『』';
const OPERATORS = `${NOT_SYMBOL}\\-\\^${SUM_SYMBOL}\\${DIFFERENCE_SYMBOL}×${PRODUCT_SYMBOL}÷%<≤=≠≥>&|~\?\\u2200-\\u22FF\\u2A00-\\u2AFF\\u2190-\\u21FF\\u27F0-\\u27FF\\u2900-\\u297F`;

export const OperatorRegEx = new RegExp(`^[${OPERATORS}]`, 'u');
export const URLRegEx = new RegExp(
    /^https?:\/\/(www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/,
    'u'
);

export const DOC_SPECIAL_CHARACTERS = [
    EXAMPLE_OPEN_SYMBOL,
    EXAMPLE_CLOSE_SYMBOL,
    LINK_SYMBOL,
    TAG_OPEN_SYMBOL,
    TAG_CLOSE_SYMBOL,
    ITALIC_SYMBOL,
    UNDERSCORE_SYMBOL,
    BOLD_SYMBOL,
    EXTRA_SYMBOL,
    DOCS_SYMBOL,
    MENTION_SYMBOL,
    LIST_OPEN_SYMBOL,
    OR_SYMBOL,
    LIST_CLOSE_SYMBOL,
];

export function unescapeDocSymbols(text: string) {
    return DOC_SPECIAL_CHARACTERS.reduce(
        (literal, special) => literal.replaceAll(special + special, special),
        text
    );
}

/** Words are any sequence of characters that aren't special characters, unless those special characters are repeated, indicating an escape. */
export const WordsRegEx = new RegExp(
    `^(${DOC_SPECIAL_CHARACTERS.map((c) => {
        const escape =
            c === '/' ||
            c === '|' ||
            c === '*' ||
            c === '^' ||
            c === '$' ||
            c === OR_SYMBOL ||
            c === LIST_OPEN_SYMBOL ||
            c === LIST_CLOSE_SYMBOL
                ? '\\'
                : '';
        return `${escape}${c}${escape}${c}|`;
    }).join('')}[^\n${DOC_SPECIAL_CHARACTERS.map(
        (c) => `${c === '/' || c === '[' || c === ']' ? '\\' : ''}${c}`
    ).join('')}])+`,
    'u'
);

export const NameRegExPattern = `^[^\n\t ${ReservedSymbols.map((s) =>
    escapeRegexCharacter(s)
).join('')}${TEXT_SEPARATORS}${OPERATORS}]+`;
export const NameRegEx = new RegExp(NameRegExPattern, 'u');

export function isName(name: string) {
    return new RegExp(`${NameRegExPattern}$`, 'u').test(name);
}

function escapeRegexCharacter(c: string) {
    return /[\\\/\(\)\[\]\{\}]/.test(c) ? '\\' + c : c;
}

const patterns = [
    { pattern: LIST_OPEN_SYMBOL, types: [TokenType.ListOpen] },
    { pattern: LIST_CLOSE_SYMBOL, types: [TokenType.ListClose] },
    { pattern: SET_OPEN_SYMBOL, types: [TokenType.SetOpen] },
    { pattern: SET_CLOSE_SYMBOL, types: [TokenType.SetClose] },
    {
        pattern: COMMA_SYMBOL,
        types: [TokenType.Separator],
    },
    { pattern: EXAMPLE_OPEN_SYMBOL, types: [TokenType.ExampleOpen] },
    { pattern: EXAMPLE_CLOSE_SYMBOL, types: [TokenType.ExampleClose] },
    { pattern: LANGUAGE_SYMBOL, types: [TokenType.Language, TokenType.Italic] },
    { pattern: `${TABLE_OPEN_SYMBOL}?`, types: [TokenType.Select] },
    { pattern: `${TABLE_OPEN_SYMBOL}+`, types: [TokenType.Insert] },
    { pattern: `${TABLE_OPEN_SYMBOL}-`, types: [TokenType.Delete] },
    { pattern: `${TABLE_OPEN_SYMBOL}:`, types: [TokenType.Update] },
    { pattern: TABLE_OPEN_SYMBOL, types: [TokenType.TableOpen] },
    { pattern: TABLE_CLOSE_SYMBOL, types: [TokenType.TableClose] },
    { pattern: BIND_SYMBOL, types: [TokenType.Bind] },
    { pattern: FUNCTION_SYMBOL, types: [TokenType.Function] },
    { pattern: BORROW_SYMBOL, types: [TokenType.Borrow] },
    { pattern: SHARE_SYMBOL, types: [TokenType.Share] },
    { pattern: CONVERT_SYMBOL, types: [TokenType.Convert] },
    { pattern: CONVERT_SYMBOL2, types: [TokenType.Convert] },
    { pattern: CONVERT_SYMBOL3, types: [TokenType.Convert] },
    { pattern: NONE_SYMBOL, types: [TokenType.None, TokenType.NoneType] },
    { pattern: TYPE_SYMBOL, types: [TokenType.Type, TokenType.TypeOperator] },
    {
        pattern: OR_SYMBOL,
        types: [TokenType.Operator, TokenType.Union, TokenType.Light],
    },
    { pattern: TYPE_OPEN_SYMBOL, types: [TokenType.TypeOpen] },
    { pattern: TYPE_CLOSE_SYMBOL, types: [TokenType.TypeClose] },
    {
        pattern: TAG_OPEN_SYMBOL,
        types: [TokenType.Operator, TokenType.TagOpen],
    },
    {
        pattern: TAG_CLOSE_SYMBOL,
        types: [TokenType.Operator, TokenType.TagClose],
    },
    {
        pattern: STREAM_SYMBOL,
        types: [TokenType.Stream, TokenType.Etc],
    },
    {
        pattern: STREAM_SYMBOL2,
        types: [TokenType.Stream, TokenType.Etc],
    },
    {
        pattern: /^\$[a-zA-Z0-9?]+/,
        types: [TokenType.Mention],
    },
    { pattern: INITIAL_SYMBOL, types: [TokenType.Initial] },
    { pattern: CHANGE_SYMBOL, types: [TokenType.Change] },
    { pattern: PREVIOUS_SYMBOL, types: [TokenType.Previous] },
    { pattern: PLACEHOLDER_SYMBOL, types: [TokenType.Placeholder] },
    // Roman numerals
    {
        pattern: /^-?[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+/,
        types: [TokenType.Number, TokenType.RomanNumeral],
    },
    // Japanese numbers
    {
        pattern:
            /^-?[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/u,
        types: [TokenType.Number, TokenType.JapaneseNumeral],
    },
    // Numbers with bases between base 2 and 16
    {
        pattern: /^-?([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/,
        types: [TokenType.Number, TokenType.Base],
    },
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    {
        pattern: /^-?[0-9]+([.,][0-9]+)?%?/,
        types: [TokenType.Number, TokenType.Decimal],
    },
    {
        pattern: /^-?[.,][0-9]+%?/,
        types: [TokenType.Number, TokenType.Decimal],
    },
    { pattern: /^-?π/, types: [TokenType.Number, TokenType.Pi] },
    { pattern: /^-?∞/, types: [TokenType.Number, TokenType.Infinity] },
    // Must be after numbers, which can have a leading period.
    { pattern: PROPERTY_SYMBOL, types: [TokenType.Access, TokenType.This] },
    { pattern: TRUE_SYMBOL, types: [TokenType.Boolean] },
    { pattern: FALSE_SYMBOL, types: [TokenType.Boolean] },
    // Match non-template open/close/between strings.
    // (Starts with an open quote, followed by any sequence of 1) escaped template markers or 2) non-template markers, closed by either a matching quote or a new line)
    { pattern: /^"(\\\\|[^\\])*?("|(?=\n))/u, types: [TokenType.Text] },
    { pattern: /^[“”„](\\\\|[^\\])*?([“”„]|(?=\n))/u, types: [TokenType.Text] },
    { pattern: /^'(\\\\|[^\\])*?('|(?=\n))/u, types: [TokenType.Text] },
    { pattern: /^‘(\\\\|[^\\])*?(’|(?=\n))/u, types: [TokenType.Text] },
    { pattern: /^‹(\\\\|[^\\])*?(›|(?=\n))/u, types: [TokenType.Text] },
    { pattern: /^«(\\\\|[^\\])*?(»|(?=\n))/u, types: [TokenType.Text] },
    { pattern: /^「(\\\\|[^\\])*?(」|(?=\n))/u, types: [TokenType.Text] },
    { pattern: /^『(\\\\|[^\\])*?(』|(?=\n))/u, types: [TokenType.Text] },
    // Match template open strings
    // (Start with an open quote, followed by any 1) escaped template markers or 2) non-template markers, ending with a template marker not preceded by an escape character.)
    {
        pattern: /^["“„'‘‹«「『](\\\\|[^\\])*?\\/u,
        types: [TokenType.TemplateOpen],
    },
    // Match template close strings that don't contain another close (those are template "between" strings below).
    {
        pattern: /^\\(\\\\|[^\\⧽])*?("|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(”|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?([']|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(’|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(›|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(»|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(」|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(』|(?=\n))/u,
        types: [TokenType.TemplateClose],
    },
    // If none of the template close patterns match above, allow a new line to close.
    { pattern: /^\\(\\\\|[^\\⧽])*?(?=\n)/u, types: [TokenType.TemplateClose] },
    // Match template "between" strings that have open and unescaped close markers
    // (Start with an open template marker, followed by any 1) escaped template markers or 2) non-template markers, ending with a close template marker.)
    { pattern: /^\\(\\\\|[^\\])*?\\/u, types: [TokenType.TemplateBetween] },
    // Finally, catch any leftover single open or close parentheses.
    { pattern: EVAL_OPEN_SYMBOL, types: [TokenType.EvalOpen] },
    { pattern: EVAL_CLOSE_SYMBOL, types: [TokenType.EvalClose] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: MEASUREMENT_SYMBOL, types: [TokenType.NumberType] },
    {
        pattern: QUESTION_SYMBOL,
        types: [TokenType.BooleanType, TokenType.Conditional],
    },
    { pattern: '¿', types: [TokenType.BooleanType, TokenType.Conditional] },
    // Tokenize formatting symbols before binary ops
    // Light is tokenized with the | operator above
    {
        pattern: UNDERSCORE_SYMBOL,
        types: [TokenType.Underline, TokenType.Operator],
    },
    {
        pattern: BOLD_SYMBOL,
        types: [TokenType.Bold, TokenType.Operator],
    },
    {
        pattern: EXTRA_SYMBOL,
        types: [TokenType.Extra, TokenType.Operator],
    },
    // Prefix and infix operators are single Unicode glyphs that are surrounded by whitespace that are not one of the above
    // and one of the following:
    // - Mathematical operators: U+2200..U+22FF
    // - Supplementary operators: U+2A00–U+2AFF
    // - Arrows: U+2190–U+21FF, U+27F0–U+27FF, U+2900–U+297F
    // - Basic latin operators: +-×·÷%^<≤=≠≥>&|
    { pattern: OperatorRegEx, types: [TokenType.Operator] },
    { pattern: DOCS_SYMBOL, types: [TokenType.Doc] },
    {
        pattern: new RegExp(`^${ConceptRegEx}`),
        types: [TokenType.Concept],
    },
    { pattern: LINK_SYMBOL, types: [TokenType.Link] },

    // All other tokens are names, which are sequences of Unicode glyphs that are not one of the reserved symbols above or whitespace.
    {
        pattern: NameRegEx,
        types: [TokenType.Name],
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
    '「': '」',
    '『': '』',
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
DELIMITERS[EXAMPLE_OPEN_SYMBOL] = EXAMPLE_CLOSE_SYMBOL;
DELIMITERS[DOCS_SYMBOL] = DOCS_SYMBOL;

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
    const openExampleAndDocs: Token[] = [];
    while (source.length > 0) {
        // First read whitespace
        let space = '';

        const tokenizeDocs =
            openExampleAndDocs.length > 0 &&
            openExampleAndDocs[0].is(TokenType.Doc);

        // If we're in a doc, then read whitespace starting with newlines only.
        if (tokenizeDocs && !source.startsWith(EXAMPLE_CLOSE_SYMBOL)) {
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
        if (nextToken.is(TokenType.TemplateOpen))
            openTemplates.unshift(nextToken);
        // If the token was a close, pop
        else if (nextToken.is(TokenType.TemplateClose)) openTemplates.shift();

        // If the token was an eval open, push it on the stack.
        if (nextToken.is(TokenType.ExampleOpen))
            openExampleAndDocs.unshift(nextToken);
        // If the token was a close, pop
        else if (nextToken.is(TokenType.ExampleClose))
            openExampleAndDocs.shift();

        // If we encountered a doc, toggle the flag.
        if (nextToken.is(TokenType.Doc)) {
            if (
                openExampleAndDocs.length > 0 &&
                openExampleAndDocs[0].is(TokenType.Doc)
            )
                openExampleAndDocs.shift();
            else openExampleAndDocs.unshift(nextToken);
        }
    }

    // If there's nothing left -- or nothing but space -- and the last token isn't a already end token, add one, and remember the space before it.
    if (tokens.length === 0 || !tokens[tokens.length - 1].is(TokenType.End)) {
        const end = new Token('', TokenType.End);
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
    if (source.length === 0) return new Token('', TokenType.End);

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
            return new Token(match, TokenType.Words);
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
                (!pattern.types.includes(TokenType.TemplateClose) ||
                    openTemplates.length === 0 ||
                    match[0].endsWith(
                        TEXT_DELIMITERS[openTemplates[0].getText().charAt(0)]
                    ))
            )
                return new Token(match[0], pattern.types);
        }
    }

    // Otherwise, we fail and return an error token that contains all of the text until the next recognizable token.
    // This is a recursive call: it tries to tokenize the next character, skipping this one, going all the way to the
    // end of the source if necessary, but stopping at the nearest recognizable token.
    const next = getNextToken(source.substring(1), openTemplates, inDoc);
    return new Token(
        source.substring(
            0,
            next.is(TokenType.End)
                ? source.length
                : source.indexOf(next.getText())
        ),
        TokenType.Unknown
    );

    // for (; nextSpace < source.length; nextSpace++) {
    //     const char = source.charAt(nextSpace);
    //     if (char === ' ' || char === '\t' || char === '\n') break;
    // }

    // // Uh oh, unknown token. This should never be possible, but it probably is, since I haven't proven otherwise.
    // //
    // return new Token(source.substring(0, nextSpace), TokenType.Unknown);
}
