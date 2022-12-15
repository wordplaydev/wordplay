import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import TokenList from "./TokenList";

export const TYPE_SYMBOL = "•";
export const BOOLEAN_TYPE_SYMBOL = "?";
export const TABLE_OPEN_SYMBOL = "|";
export const TABLE_CLOSE_SYMBOL = "||";
export const CONVERT_SYMBOL = "→";
export const FUNCTION_SYMBOL = "ƒ";
export const EVAL_OPEN_SYMBOL = "(";
export const EVAL_CLOSE_SYMBOL = ")";
export const LANGUAGE_SYMBOL = "/";
export const LIST_OPEN_SYMBOL = "[";
export const LIST_CLOSE_SYMBOL = "]";
export const SET_OPEN_SYMBOL = "{";
export const SET_CLOSE_SYMBOL = "}";
export const TYPE_OPEN_SYMBOL = "⸨";
export const TYPE_CLOSE_SYMBOL = "⸩";
export const BIND_SYMBOL = ":";
export const NAME_SEPARATOR_SYMBOL = ",";
export const MEASUREMENT_SYMBOL = "#";
export const NONE_SYMBOL = "ø";
export const REACTION_SYMBOL = "∆";
export const PREVIOUS_SYMBOL = "←";
export const TEXT_SYMBOL = "''";
export const AND_SYMBOL = "∧";
export const OR_SYMBOL = "∨";
export const NOT_SYMBOL = "¬";
export const TRUE_SYMBOL = "⊤";
export const FALSE_SYMBOL = "⊥";
export const PROPERTY_SYMBOL = ".";
export const BORROW_SYMBOL = "↓";
export const SHARE_SYMBOL = "↑";
export const DOCS_SYMBOL = "`";
export const PLACEHOLDER_SYMBOL = "_";
export const ETC_SYMBOL = "…";
export const TEMPLATE_SYMBOL = "\\";
export const THIS_SYMBOL = "*";
export const BASE_SYMBOL = ";";
export const PRODUCT_SYMBOL = "·";
export const EXPONENT_SYMBOL = "^";

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
    BIND_SYMBOL,
    PROPERTY_SYMBOL,
    BASE_SYMBOL,
    FUNCTION_SYMBOL,
    BORROW_SYMBOL,
    SHARE_SYMBOL,
    DOCS_SYMBOL,
    NONE_SYMBOL,
    TYPE_SYMBOL,
    REACTION_SYMBOL,
    PREVIOUS_SYMBOL,
    CONVERT_SYMBOL,
    PLACEHOLDER_SYMBOL,
    ETC_SYMBOL,
    TRUE_SYMBOL,
    FALSE_SYMBOL,
    NOT_SYMBOL,
    LANGUAGE_SYMBOL,
    THIS_SYMBOL,
    NAME_SEPARATOR_SYMBOL
];

const TEXT_SEPARATORS = "'‘’\"“”„«»‹›「」『』";
const UNARY_OPERATORS = "¬-";
const BINARY_OPERATORS = '+\\-×·÷%^<≤=≠≥>∧∨~\?\\u2200-\\u22FF\\u2A00-\\u2AFF\\u2190-\\u21FF\\u27F0-\\u27FF\\u2900-\\u297F';

export const BinaryOpRegEx = new RegExp(`^[${BINARY_OPERATORS}]`, "u");

function escapeRegexCharacter(c: string) { return /[\\\/\(\)\[\]\{\}]/.test(c) ? "\\" + c : c }

const patterns = [
    { pattern: LIST_OPEN_SYMBOL, types: [ TokenType.LIST_OPEN ] },
    { pattern: LIST_CLOSE_SYMBOL, types: [ TokenType.LIST_CLOSE ] },
    { pattern: SET_OPEN_SYMBOL, types: [ TokenType.SET_OPEN ] },
    { pattern: SET_CLOSE_SYMBOL, types: [ TokenType.SET_CLOSE ] },
    { pattern: NAME_SEPARATOR_SYMBOL, types: [ TokenType.NAME_SEPARATOR ] },
    { pattern: LANGUAGE_SYMBOL, types: [ TokenType.LANGUAGE ] },
    { pattern: "|?", types: [ TokenType.SELECT] },
    { pattern: "|+", types: [ TokenType.INSERT] },
    { pattern: "|-", types: [ TokenType.DELETE] },  
    { pattern: "|:", types: [ TokenType.UPDATE] },
    { pattern: TABLE_CLOSE_SYMBOL, types: [ TokenType.TABLE_CLOSE ] },
    { pattern: TABLE_OPEN_SYMBOL, types: [ TokenType.TABLE_OPEN ] },
    { pattern: BIND_SYMBOL, types: [ TokenType.BIND ] },
    { pattern: FUNCTION_SYMBOL, types: [ TokenType.FUNCTION ] },
    { pattern: BORROW_SYMBOL, types: [ TokenType.BORROW ] },
    { pattern: SHARE_SYMBOL, types: [ TokenType.SHARE ] },
    { pattern: CONVERT_SYMBOL, types: [ TokenType.CONVERT ] },
    { pattern: THIS_SYMBOL, types: [ TokenType.THIS ] },
    { pattern: new RegExp(`^${DOCS_SYMBOL}.*?${DOCS_SYMBOL}`), types: [ TokenType.DOCS ] },
    { pattern: NONE_SYMBOL, types: [ TokenType.NONE, TokenType.NONE_TYPE ] },
    { pattern: TYPE_SYMBOL, types: [ TokenType.TYPE, TokenType.TYPE_OP, TokenType.UNION ] },
    { pattern: TYPE_OPEN_SYMBOL, types: [ TokenType.TYPE_OPEN ] },
    { pattern: TYPE_CLOSE_SYMBOL, types: [ TokenType.TYPE_CLOSE ] },
    { pattern: REACTION_SYMBOL, types: [ TokenType.REACTION, TokenType.STREAM_TYPE ] },
    { pattern: PREVIOUS_SYMBOL, types: [ TokenType.PREVIOUS ] },
    { pattern: PLACEHOLDER_SYMBOL, types: [ TokenType.PLACEHOLDER ] },
    { pattern: ETC_SYMBOL, types: [ TokenType.ETC ] },
    // Roman numerals
    { pattern: /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+/, types: [ TokenType.NUMBER, TokenType.ROMAN ] },
    // Japanese numbers
    { pattern: /^[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/u, types: [ TokenType.NUMBER, TokenType.JAPANESE ] },
    // Numbers with bases between base 2 and 16
    { pattern: /^([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/, types: [ TokenType.NUMBER, TokenType.BASE ] },    
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    { pattern: /^[0-9]+([.,][0-9]+)?%?/, types: [ TokenType.NUMBER, TokenType.DECIMAL ] },
    { pattern: /^[.,][0-9]+%?/, types: [ TokenType.NUMBER, TokenType.DECIMAL ] },
    { pattern: "π", types: [ TokenType.NUMBER, TokenType.PI ] },
    { pattern: "∞", types: [ TokenType.NUMBER, TokenType.INFINITY ] },
    // Must be after numbers, which can have a leading period.
    { pattern: PROPERTY_SYMBOL, types: [ TokenType.ACCESS ] },
    { pattern: TRUE_SYMBOL, types: [ TokenType.BOOLEAN ] },
    { pattern: FALSE_SYMBOL, types: [ TokenType.BOOLEAN ] },
    // Lazily match non-template strings that lack open parentheses and aren't closed with a preceding escape.
    { pattern: /^"[^\\]*?("|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^“[^\\]*?(”|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^„[^\\]*?(“|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^'[^\\]*?('|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^‘[^\\]*?(’|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^‹[^\\]*?(›|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^«[^\\]*?(»|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^「[^\\]*?(」|(?=\n))/u, types: [ TokenType.TEXT ] },
    { pattern: /^『[^\\]*?(』|(?=\n))/u, types: [ TokenType.TEXT ] },
    // Lazily match open template strings that aren't opened with a preceding scape.
    { pattern: /^["“„'‘‹«「『].*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    // Lazily match closing strings that don't contain another opening string. This allows betweens to match.
    { pattern: /^\\[^\\]*?("|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?(”|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?([']|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?(’|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?(›|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?(»|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?(」|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?(』|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    // If none of the closed patterns match above, allow a new line to close the text literal.
    { pattern: /^\\[^\\]*?(?=\n)”/u, types: [ TokenType.TEXT_CLOSE ] },
    // Match this after the eval close to avoid capturing function evaluations in templates.
    { pattern: /^\\.*?\\/u, types: [ TokenType.TEXT_BETWEEN ] },
    // Finally, catch any leftover single open or close parentheses.
    { pattern: EVAL_OPEN_SYMBOL, types: [ TokenType.EVAL_OPEN ] },
    { pattern: EVAL_CLOSE_SYMBOL, types: [ TokenType.EVAL_CLOSE ] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: MEASUREMENT_SYMBOL, types: [ TokenType.NUMBER_TYPE ] },
    { pattern: BOOLEAN_TYPE_SYMBOL, types: [ TokenType.BOOLEAN_TYPE, TokenType.CONDITIONAL ] },
    { pattern: "¿", types: [ TokenType.BOOLEAN_TYPE, TokenType.CONDITIONAL ] },
    // Prefix and infix operators are single Unicode glyphs that are surrounded by whitespace that are not one of the above
    // and one of the following:
    // - Mathematical operators: U+2200..U+22FF
    // - Supplementary operators: U+2A00–U+2AFF
    // - Arrows: U+2190–U+21FF, U+27F0–U+27FF, U+2900–U+297F
    // - Basic latin operators: +-×·÷%^<≤=≠≥>∧∨
    { pattern: new RegExp(`^[${UNARY_OPERATORS}](?! )`, "u"), types: [ TokenType.UNARY_OP ] },
    { pattern: BinaryOpRegEx, types: [ TokenType.BINARY_OP ] },
    // All other tokens are names, which are sequences of Unicode glyphs that are not one of the reserved symbols above or whitespace.
    { 
        pattern: new RegExp(`^[^\n\t ${RESERVED_SYMBOLS.map(s => escapeRegexCharacter(s)).join("")}${TEXT_SEPARATORS}${BINARY_OPERATORS}]+`, "u"), 
        types: [ TokenType.NAME ] 
    }
];

const TEXT_DELIMITERS: Record<string,string> = { 
    '"': '"',
    '“': '”',
    '„': '“',
    "'": "'",
    '‘': '’',
    '‹': '›',
    '«': '»',
    '「': '」',
    '『': '』'
}

export const DELIMITERS: Record<string,string> = {};

// Add the data structure delimiters
DELIMITERS[EVAL_OPEN_SYMBOL] = EVAL_CLOSE_SYMBOL;
DELIMITERS[LIST_OPEN_SYMBOL] = LIST_CLOSE_SYMBOL;
DELIMITERS[SET_OPEN_SYMBOL] = SET_CLOSE_SYMBOL;
DELIMITERS[TYPE_OPEN_SYMBOL] = TYPE_CLOSE_SYMBOL;
// Add the text delimiters.
for(const [open, close] of Object.entries(TEXT_DELIMITERS))
    DELIMITERS[open] = close;

// Construct the reverse delimiters.
export const REVERSE_DELIMITERS: Record<string,string> = {};

for(const [ open, close ] of Object.values(DELIMITERS))
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
    while(source.length > 0) {

        const [ nextToken, space ] = getNextToken(source, openTemplates);

        // Add the token to the list
        tokens.push(nextToken);

        // Save the space for the token.
        if(space.length > 0)
            spaces.set(nextToken, space);

        // Trim the token off the source.
        source = source.substring(nextToken.text.toString().length + space.length);

        // If the token was a text open, push it on the stack.
        if(nextToken.is(TokenType.TEXT_OPEN))
            openTemplates.unshift(nextToken);
        // If the token was a close, pop
        else if(nextToken.is(TokenType.TEXT_CLOSE))
            openTemplates.shift();

    }

    // If there's nothing left -- or nothing but space -- and the last token isn't a already end token, add one.
    if(tokens.length === 0 || !tokens[tokens.length - 1].is(TokenType.END)) {
        const end = new Token("", TokenType.END);
        tokens.push(end);
    }

    return new TokenList(tokens, spaces);

}

function getNextToken(source: string, openTemplates: Token[]): [ Token, string ] {

    // Is there a series of space or tabs?
    const spaceMatch = source.match(/^[ \t\n]+/);
    const space = spaceMatch === null ? "" : spaceMatch[0];
    const trimmedSource = source.substring(space.length);

    // If there's nothing left after trimming source, return an end of file token.
    if(trimmedSource.length === 0) return [ new Token("", TokenType.END), space ];

    // See if one of the more complex regular expression patterns matches.
    for(let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        // If it's a string pattern, just see if the source starts with it.
        if(typeof pattern.pattern === 'string' && trimmedSource.startsWith(pattern.pattern))
            return [ new Token(pattern.pattern, pattern.types), space ];
        else if(pattern.pattern instanceof RegExp) {
            const match = trimmedSource.match(pattern.pattern);
            // If we found a match, return it if
            // 1) It's _not_ a text close, or
            // 2) It is, but there are either no open templates (syntax error!), or
            // 3) There is an open template and it's the closing delimiter matches the current open text delimiter.
            if(match !== null && (!pattern.types.includes(TokenType.TEXT_CLOSE) || openTemplates.length === 0 || (match[0].endsWith(TEXT_DELIMITERS[openTemplates[0].getText().charAt(0)]))))
                return [ new Token(match[0], pattern.types), space ];
        }
    }
    
    // Otherwise, we fail and return an error token that contains all of the text until the next space.
    let nextSpace = 0;
    for(; nextSpace < trimmedSource.length; nextSpace++) {
        const char = trimmedSource.charAt(nextSpace);
        if(char === " " || char === "\t" || char === "\n") break;
    }

    // Uh oh, unknown token. This should never be possible, but it probably is, since I haven't proven otherwise.
    return [ new Token(trimmedSource.substring(0, nextSpace), TokenType.UNKNOWN), space ];

}