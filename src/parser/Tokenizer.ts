import Token from '@nodes/Token';
import Symbol from '@nodes/Symbol';
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
    /^(https?)?:\/\/(www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/,
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
    { pattern: LIST_OPEN_SYMBOL, types: [Symbol.ListOpen] },
    { pattern: LIST_CLOSE_SYMBOL, types: [Symbol.ListClose] },
    { pattern: SET_OPEN_SYMBOL, types: [Symbol.SetOpen] },
    { pattern: SET_CLOSE_SYMBOL, types: [Symbol.SetClose] },
    {
        pattern: COMMA_SYMBOL,
        types: [Symbol.Separator],
    },
    { pattern: EXAMPLE_OPEN_SYMBOL, types: [Symbol.ExampleOpen] },
    { pattern: EXAMPLE_CLOSE_SYMBOL, types: [Symbol.ExampleClose] },
    { pattern: LANGUAGE_SYMBOL, types: [Symbol.Language, Symbol.Italic] },
    { pattern: `${TABLE_OPEN_SYMBOL}?`, types: [Symbol.Select] },
    { pattern: `${TABLE_OPEN_SYMBOL}+`, types: [Symbol.Insert] },
    { pattern: `${TABLE_OPEN_SYMBOL}-`, types: [Symbol.Delete] },
    { pattern: `${TABLE_OPEN_SYMBOL}:`, types: [Symbol.Update] },
    { pattern: TABLE_OPEN_SYMBOL, types: [Symbol.TableOpen] },
    { pattern: TABLE_CLOSE_SYMBOL, types: [Symbol.TableClose] },
    { pattern: BIND_SYMBOL, types: [Symbol.Bind] },
    { pattern: FUNCTION_SYMBOL, types: [Symbol.Function] },
    { pattern: BORROW_SYMBOL, types: [Symbol.Borrow] },
    { pattern: SHARE_SYMBOL, types: [Symbol.Share] },
    { pattern: CONVERT_SYMBOL, types: [Symbol.Convert] },
    { pattern: CONVERT_SYMBOL2, types: [Symbol.Convert] },
    { pattern: CONVERT_SYMBOL3, types: [Symbol.Convert] },
    { pattern: NONE_SYMBOL, types: [Symbol.None, Symbol.None] },
    { pattern: TYPE_SYMBOL, types: [Symbol.Type, Symbol.TypeOperator] },
    {
        pattern: OR_SYMBOL,
        types: [Symbol.Operator, Symbol.Union, Symbol.Light],
    },
    { pattern: TYPE_OPEN_SYMBOL, types: [Symbol.TypeOpen] },
    { pattern: TYPE_CLOSE_SYMBOL, types: [Symbol.TypeClose] },
    {
        pattern: TAG_OPEN_SYMBOL,
        types: [Symbol.Operator, Symbol.TagOpen],
    },
    {
        pattern: TAG_CLOSE_SYMBOL,
        types: [Symbol.Operator, Symbol.TagClose],
    },
    {
        pattern: STREAM_SYMBOL,
        types: [Symbol.Stream, Symbol.Etc],
    },
    {
        pattern: STREAM_SYMBOL2,
        types: [Symbol.Stream, Symbol.Etc],
    },
    {
        pattern: /^\$[a-zA-Z0-9?]+/,
        types: [Symbol.Mention],
    },
    { pattern: INITIAL_SYMBOL, types: [Symbol.Initial] },
    { pattern: CHANGE_SYMBOL, types: [Symbol.Change] },
    { pattern: PREVIOUS_SYMBOL, types: [Symbol.Previous] },
    { pattern: PLACEHOLDER_SYMBOL, types: [Symbol.Placeholder] },
    // Roman numerals
    {
        pattern: /^-?[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+/,
        types: [Symbol.Number, Symbol.RomanNumeral],
    },
    // Japanese numbers
    {
        pattern:
            /^-?[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/u,
        types: [Symbol.Number, Symbol.JapaneseNumeral],
    },
    // Numbers with bases between base 2 and 16
    {
        pattern: /^-?([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/,
        types: [Symbol.Number, Symbol.Base],
    },
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    {
        pattern: /^-?[0-9]+([.,][0-9]+)?%?/,
        types: [Symbol.Number, Symbol.Decimal],
    },
    {
        pattern: /^-?[.,][0-9]+%?/,
        types: [Symbol.Number, Symbol.Decimal],
    },
    { pattern: /^-?π/, types: [Symbol.Number, Symbol.Pi] },
    { pattern: /^-?∞/, types: [Symbol.Number, Symbol.Infinity] },
    // Must be after numbers, which can have a leading period.
    { pattern: PROPERTY_SYMBOL, types: [Symbol.Access, Symbol.This] },
    { pattern: TRUE_SYMBOL, types: [Symbol.Boolean] },
    { pattern: FALSE_SYMBOL, types: [Symbol.Boolean] },
    // Match non-template open/close/between strings.
    // (Starts with an open quote, followed by any sequence of 1) escaped template markers or 2) non-template markers, closed by either a matching quote or a new line)
    { pattern: /^"(\\\\|[^\\])*?("|(?=\n))/u, types: [Symbol.Text] },
    { pattern: /^[“”„](\\\\|[^\\])*?([“”„]|(?=\n))/u, types: [Symbol.Text] },
    { pattern: /^'(\\\\|[^\\])*?('|(?=\n))/u, types: [Symbol.Text] },
    { pattern: /^‘(\\\\|[^\\])*?(’|(?=\n))/u, types: [Symbol.Text] },
    { pattern: /^‹(\\\\|[^\\])*?(›|(?=\n))/u, types: [Symbol.Text] },
    { pattern: /^«(\\\\|[^\\])*?(»|(?=\n))/u, types: [Symbol.Text] },
    { pattern: /^「(\\\\|[^\\])*?(」|(?=\n))/u, types: [Symbol.Text] },
    { pattern: /^『(\\\\|[^\\])*?(』|(?=\n))/u, types: [Symbol.Text] },
    // Match template open strings
    // (Start with an open quote, followed by any 1) escaped template markers or 2) non-template markers, ending with a template marker not preceded by an escape character.)
    {
        pattern: /^["“„'‘‹«「『](\\\\|[^\\])*?\\/u,
        types: [Symbol.TemplateOpen],
    },
    // Match template close strings that don't contain another close (those are template "between" strings below).
    {
        pattern: /^\\(\\\\|[^\\⧽])*?("|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(”|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?([']|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(’|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(›|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(»|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(」|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    {
        pattern: /^\\(\\\\|[^\\⧽])*?(』|(?=\n))/u,
        types: [Symbol.TemplateClose],
    },
    // If none of the template close patterns match above, allow a new line to close.
    { pattern: /^\\(\\\\|[^\\⧽])*?(?=\n)/u, types: [Symbol.TemplateClose] },
    // Match template "between" strings that have open and unescaped close markers
    // (Start with an open template marker, followed by any 1) escaped template markers or 2) non-template markers, ending with a close template marker.)
    { pattern: /^\\(\\\\|[^\\])*?\\/u, types: [Symbol.TemplateBetween] },
    // Finally, catch any leftover single open or close parentheses.
    { pattern: EVAL_OPEN_SYMBOL, types: [Symbol.EvalOpen] },
    { pattern: EVAL_CLOSE_SYMBOL, types: [Symbol.EvalClose] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: MEASUREMENT_SYMBOL, types: [Symbol.NumberType] },
    {
        pattern: QUESTION_SYMBOL,
        types: [Symbol.BooleanType, Symbol.Conditional],
    },
    { pattern: '¿', types: [Symbol.BooleanType, Symbol.Conditional] },
    // Tokenize formatting symbols before binary ops
    // Light is tokenized with the | operator above
    {
        pattern: UNDERSCORE_SYMBOL,
        types: [Symbol.Underline, Symbol.Operator],
    },
    {
        pattern: BOLD_SYMBOL,
        types: [Symbol.Bold, Symbol.Operator],
    },
    {
        pattern: EXTRA_SYMBOL,
        types: [Symbol.Extra, Symbol.Operator],
    },
    // Prefix and infix operators are single Unicode glyphs that are surrounded by whitespace that are not one of the above
    // and one of the following:
    // - Mathematical operators: U+2200..U+22FF
    // - Supplementary operators: U+2A00–U+2AFF
    // - Arrows: U+2190–U+21FF, U+27F0–U+27FF, U+2900–U+297F
    // - Basic latin operators: +-×·÷%^<≤=≠≥>&|
    { pattern: OperatorRegEx, types: [Symbol.Operator] },
    { pattern: DOCS_SYMBOL, types: [Symbol.Doc] },
    {
        pattern: new RegExp(`^${ConceptRegEx}`),
        types: [Symbol.Concept],
    },
    { pattern: LINK_SYMBOL, types: [Symbol.Link] },

    // All other tokens are names, which are sequences of Unicode glyphs that are not one of the reserved symbols above or whitespace.
    {
        pattern: NameRegEx,
        types: [Symbol.Name],
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
            openExampleAndDocs[0].isSymbol(Symbol.Doc);

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
        if (nextToken.isSymbol(Symbol.TemplateOpen))
            openTemplates.unshift(nextToken);
        // If the token was a close, pop
        else if (nextToken.isSymbol(Symbol.TemplateClose))
            openTemplates.shift();

        // If the token was an eval open, push it on the stack.
        if (nextToken.isSymbol(Symbol.ExampleOpen))
            openExampleAndDocs.unshift(nextToken);
        // If the token was a close, pop
        else if (nextToken.isSymbol(Symbol.ExampleClose))
            openExampleAndDocs.shift();

        // If we encountered a doc, toggle the flag.
        if (nextToken.isSymbol(Symbol.Doc)) {
            if (
                openExampleAndDocs.length > 0 &&
                openExampleAndDocs[0].isSymbol(Symbol.Doc)
            )
                openExampleAndDocs.shift();
            else openExampleAndDocs.unshift(nextToken);
        }
    }

    // If there's nothing left -- or nothing but space -- and the last token isn't a already end token, add one, and remember the space before it.
    if (
        tokens.length === 0 ||
        !tokens[tokens.length - 1].isSymbol(Symbol.End)
    ) {
        const end = new Token('', Symbol.End);
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
    if (source.length === 0) return new Token('', Symbol.End);

    // If we're in a doc, special case a few token types that only appear in docs (URL, WORDS)
    if (inDoc) {
        // Check URLs first, since the word regex will match URLs.
        const urlMatch = source.match(URLRegEx);
        if (urlMatch !== null) return new Token(urlMatch[0], Symbol.URL);

        const wordsMatch = source.match(WordsRegEx);
        if (wordsMatch !== null) {
            // Take everything up until two newlines separated only by space.
            const match = wordsMatch[0].split(/\n[ \t]*\n/)[0];
            // Add the preceding space back on, since it's part of the words.
            return new Token(match, Symbol.Words);
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
                (!pattern.types.includes(Symbol.TemplateClose) ||
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
            next.isSymbol(Symbol.End)
                ? source.length
                : source.indexOf(next.getText())
        ),
        Symbol.Unknown
    );

    // for (; nextSpace < source.length; nextSpace++) {
    //     const char = source.charAt(nextSpace);
    //     if (char === ' ' || char === '\t' || char === '\n') break;
    // }

    // // Uh oh, unknown token. This should never be possible, but it probably is, since I haven't proven otherwise.
    // //
    // return new Token(source.substring(0, nextSpace), TokenType.Unknown);
}
