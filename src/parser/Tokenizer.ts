import Token from '@nodes/Token';
import Sym from '@nodes/Sym';
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
    LITERAL_SYMBOL,
    INITIAL_SYMBOL,
    SUM_SYMBOL,
    DIFFERENCE_SYMBOL,
    ITALIC_SYMBOL,
    UNDERSCORE_SYMBOL,
    BOLD_SYMBOL,
    EXTRA_SYMBOL,
    MENTION_SYMBOL,
    CONVERT_SYMBOL2,
    CONVERT_SYMBOL3,
    STREAM_SYMBOL2,
    LIGHT_SYMBOL,
    CODE_SYMBOL,
    FORMATTED_SYMBOL,
    FORMATTED_TYPE_SYMBOL,
    GLOBE1_SYMBOL,
    GLOBE2_SYMBOL,
    GLOBE3_SYMBOL,
    SELECT_SYMBOL,
    INSERT_SYMBOL,
    DELETE_SYMBOL,
    UPDATE_SYMBOL,
    COALESCE_SYMBOL,
} from './Symbols';
import TokenList from './TokenList';
import ConceptRegEx from './ConceptRegEx';
import ReservedSymbols from './ReservedSymbols';

const TEXT_SEPARATORS = '\'‘’"“”„«»‹›「」『』';
const OPERATORS = `${NOT_SYMBOL}\\-\\^${SUM_SYMBOL}\\${DIFFERENCE_SYMBOL}×${PRODUCT_SYMBOL}÷%<≤=≠≥>&|~?\\u2200-\\u22FF\\u2A00-\\u2AFF\\u2190-\\u21FF\\u27F0-\\u27FF\\u2900-\\u297F`;

export const OperatorRegEx = new RegExp(`^[${OPERATORS}]`, 'u');
export const URLRegEx = new RegExp(
    /^(https?)?:\/\/(www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/,
    'u'
);

export const MarkupSymbols = [
    CODE_SYMBOL,
    LINK_SYMBOL,
    TAG_OPEN_SYMBOL,
    TAG_CLOSE_SYMBOL,
    ITALIC_SYMBOL,
    UNDERSCORE_SYMBOL,
    BOLD_SYMBOL,
    EXTRA_SYMBOL,
    DOCS_SYMBOL,
    LIGHT_SYMBOL,
    MENTION_SYMBOL,
    LIST_OPEN_SYMBOL,
    OR_SYMBOL,
    LIST_CLOSE_SYMBOL,
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
        text
    );
}

/** Words are any sequence of characters that aren't formatting characters, unless those special characters are repeated, indicating an escape. */
export const WordsRegEx = new RegExp(
    // Escape regex special characters
    `^(${MarkupSymbols.map((c) => {
        const escape =
            c === '\\' ||
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
    }).join('')}[^\n${MarkupSymbols.map(
        // Escape character class special characters
        (c) =>
            `${
                c === '\\' || c === '/' || c === '[' || c === ']' ? '\\' : ''
            }${c}`
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
    return /[\\/()[\]{}]/.test(c) ? '\\' + c : c;
}

type TokenPattern = {
    pattern: string | RegExp;
    types: Sym[];
};

const CodePattern = { pattern: CODE_SYMBOL, types: [Sym.Code] };
const FormattedPattern = { pattern: FORMATTED_SYMBOL, types: [Sym.Formatted] };
const DocPattern = { pattern: DOCS_SYMBOL, types: [Sym.Doc] };
const ListOpenPattern = { pattern: LIST_OPEN_SYMBOL, types: [Sym.ListOpen] };
const ListClosePattern = { pattern: LIST_CLOSE_SYMBOL, types: [Sym.ListClose] };

/** Valid tokens inside of code. */
const CodeTokenPatterns: TokenPattern[] = [
    ListOpenPattern,
    ListClosePattern,
    { pattern: SET_OPEN_SYMBOL, types: [Sym.SetOpen] },
    { pattern: SET_CLOSE_SYMBOL, types: [Sym.SetClose] },
    {
        pattern: COMMA_SYMBOL,
        types: [Sym.Separator],
    },
    { pattern: LANGUAGE_SYMBOL, types: [Sym.Language] },
    { pattern: SELECT_SYMBOL, types: [Sym.Select] },
    { pattern: INSERT_SYMBOL, types: [Sym.Insert] },
    { pattern: DELETE_SYMBOL, types: [Sym.Delete] },
    { pattern: UPDATE_SYMBOL, types: [Sym.Update] },
    { pattern: TABLE_OPEN_SYMBOL, types: [Sym.TableOpen] },
    { pattern: TABLE_CLOSE_SYMBOL, types: [Sym.TableClose] },
    { pattern: BIND_SYMBOL, types: [Sym.Bind] },
    { pattern: FUNCTION_SYMBOL, types: [Sym.Function] },
    { pattern: BORROW_SYMBOL, types: [Sym.Borrow] },
    { pattern: SHARE_SYMBOL, types: [Sym.Share] },
    { pattern: CONVERT_SYMBOL, types: [Sym.Convert] },
    { pattern: CONVERT_SYMBOL2, types: [Sym.Convert] },
    { pattern: CONVERT_SYMBOL3, types: [Sym.Convert] },
    { pattern: NONE_SYMBOL, types: [Sym.None, Sym.None] },
    { pattern: TYPE_SYMBOL, types: [Sym.Type, Sym.TypeOperator] },
    { pattern: LITERAL_SYMBOL, types: [Sym.Literal] },
    {
        pattern: OR_SYMBOL,
        types: [Sym.Operator, Sym.Union],
    },
    { pattern: TYPE_OPEN_SYMBOL, types: [Sym.TypeOpen] },
    { pattern: TYPE_CLOSE_SYMBOL, types: [Sym.TypeClose] },
    {
        pattern: STREAM_SYMBOL,
        types: [Sym.Stream, Sym.Etc],
    },
    {
        pattern: STREAM_SYMBOL2,
        types: [Sym.Stream, Sym.Etc],
    },
    { pattern: INITIAL_SYMBOL, types: [Sym.Initial] },
    { pattern: CHANGE_SYMBOL, types: [Sym.Change] },
    { pattern: PREVIOUS_SYMBOL, types: [Sym.Previous] },
    {
        pattern: PLACEHOLDER_SYMBOL,
        types: [Sym.Placeholder, Sym.Underline, Sym.Operator],
    },
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
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    {
        pattern: /^-?[0-9]+([.,][0-9]+)?%?/,
        types: [Sym.Number, Sym.Decimal],
    },
    {
        pattern: /^-?[.,][0-9]+%?/,
        types: [Sym.Number, Sym.Decimal],
    },
    { pattern: /^-?π/, types: [Sym.Number, Sym.Pi] },
    { pattern: /^-?∞/, types: [Sym.Number, Sym.Infinity] },
    // Must be after numbers, which can have a leading period.
    { pattern: PROPERTY_SYMBOL, types: [Sym.Access, Sym.This] },
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
    { pattern: EVAL_OPEN_SYMBOL, types: [Sym.EvalOpen] },
    { pattern: EVAL_CLOSE_SYMBOL, types: [Sym.EvalClose] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: MEASUREMENT_SYMBOL, types: [Sym.NumberType] },
    {
        pattern: COALESCE_SYMBOL,
        types: [Sym.Otherwise],
    },
    {
        pattern: QUESTION_SYMBOL,
        types: [Sym.BooleanType, Sym.Conditional],
    },
    { pattern: '¿', types: [Sym.BooleanType, Sym.Conditional] },
    { pattern: '-', types: [Sym.Operator, Sym.Region] },
    { pattern: GLOBE1_SYMBOL, types: [Sym.Locale] },
    { pattern: GLOBE2_SYMBOL, types: [Sym.Locale] },
    { pattern: GLOBE3_SYMBOL, types: [Sym.Locale] },
    // Prefix and infix operators are single Unicode glyphs that are surrounded by whitespace that are not one of the above
    // and one of the following:
    // - Mathematical operators: U+2200..U+22FF
    // - Supplementary operators: U+2A00–U+2AFF
    // - Arrows: U+2190–U+21FF, U+27F0–U+27FF, U+2900–U+297F
    // - Basic latin operators: +-×·÷%^<≤=≠≥>&|
    { pattern: OperatorRegEx, types: [Sym.Operator] },
    { pattern: FORMATTED_TYPE_SYMBOL, types: [Sym.FormattedType] },
    { pattern: '`...`', types: [Sym.FormattedType] },
    DocPattern,
    // Must be after docs
    FormattedPattern,

    // All other tokens are names, which are sequences of Unicode glyphs that are not one of the reserved symbols above or whitespace.
    {
        pattern: NameRegEx,
        types: [Sym.Name],
    },
];

/** Valid tokens inside of markup. */
const MarkupTokenPatterns = [
    DocPattern,
    FormattedPattern,
    CodePattern,
    ListOpenPattern,
    ListClosePattern,
    {
        pattern: new RegExp(`^${ConceptRegEx}`),
        types: [Sym.Concept],
    },
    { pattern: LINK_SYMBOL, types: [Sym.Link] },
    { pattern: LANGUAGE_SYMBOL, types: [Sym.Italic] },
    {
        pattern: LIGHT_SYMBOL,
        types: [Sym.Light],
    },
    {
        pattern: UNDERSCORE_SYMBOL,
        types: [Sym.Underline],
    },
    {
        pattern: BOLD_SYMBOL,
        types: [Sym.Bold],
    },
    {
        pattern: EXTRA_SYMBOL,
        types: [Sym.Extra],
    },
    {
        pattern: /^\$[a-zA-Z0-9?]+/,
        types: [Sym.Mention],
    },
    {
        pattern: TAG_OPEN_SYMBOL,
        types: [Sym.TagOpen],
    },
    {
        pattern: TAG_CLOSE_SYMBOL,
        types: [Sym.TagClose],
    },
    {
        pattern: OR_SYMBOL,
        types: [Sym.Union],
    },
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
DelimiterCloseByOpen[LIST_OPEN_SYMBOL] = LIST_CLOSE_SYMBOL;
DelimiterCloseByOpen[SET_OPEN_SYMBOL] = SET_CLOSE_SYMBOL;
DelimiterCloseByOpen[TYPE_OPEN_SYMBOL] = TYPE_CLOSE_SYMBOL;
DelimiterCloseByOpen[TABLE_OPEN_SYMBOL] = TABLE_CLOSE_SYMBOL;
DelimiterCloseByOpen[CODE_SYMBOL] = CODE_SYMBOL;
DelimiterCloseByOpen[DOCS_SYMBOL] = DOCS_SYMBOL;

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

    // Start with an empty list
    const tokens: Token[] = [];

    // Create a mapping from tokens to space.
    const spaces = new Map<Token, string>();

    // Maintain a stack of context tokens, helping us know when we are opening and closing text, docs, and code, as each has different tokenization rules.
    const context: Token[] = [];
    while (source.length > 0) {
        // First read whitespace
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
        // If we're not in a doc, then slurp preceding space before the next token.
        else {
            space = getNextSpace(source);
        }

        // Trim the space we found.
        source = source.substring(space.length);

        // Tokenize the next token. We tokenize in documentation mode if we're inside a doc and the eval depth
        // has not changed since we've entered.
        const stuff = getNextToken(source, context);

        // Did the next token pull out some unexpected space? Override the space
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
    context: Token[]
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
                TextCloseByTextOpen[container.getText()]
            );
            const lineIndex = source.indexOf('\n');
            const stopIndex = Math.min(
                codeIndex < 0 ? Number.POSITIVE_INFINITY : codeIndex,
                closeIndex < 0 ? Number.POSITIVE_INFINITY : closeIndex,
                lineIndex < 0 ? Number.POSITIVE_INFINITY : lineIndex
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
                            : stopIndex
                    ),
                    Sym.Words
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

function getNextSpace(source: string) {
    const spaceMatch = source.match(/^[ \t\n]+/);
    return spaceMatch === null ? '' : spaceMatch[0];
}
