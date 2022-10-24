import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";

export const TYPE_SYMBOL = "•";
export const TYPE_VAR_SYMBOL = "∘";
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
export const BIND_SYMBOL = ":";
export const ALIAS_SYMBOL = ",";
export const MEASUREMENT_SYMBOL = "#";
export const NONE_SYMBOL = "!";
export const REACTION_SYMBOL = "∆";
export const PREVIOUS_SYMBOL = "@";
export const TEXT_SYMBOL = "''";
export const AND_SYMBOL = "∧";
export const OR_SYMBOL = "∨";
export const NOT_SYMBOL = "¬";
export const TRUE_SYMBOL = "⊤";
export const FALSE_SYMBOL = "⊥";
export const ACCESS_SYMBOL = ".";
export const BORROW_SYMBOL = "↓";
export const SHARE_SYMBOL = "↑";
export const DOCS_SYMBOL = "`";
export const PLACEHOLDER_SYMBOL = "…";
export const TEMPLATE_SYMBOL = "\\";
export const THIS_SYMBOL = "*";
export const BASE_SYMBOL = ";";
export const PRODUCT_SYMBOL = "·";
export const EXPONENT_SYMBOL = "^";
export const ANONYMOUS_SYMBOL = "👤" 

const RESERVED_SYMBOLS = [
    TEMPLATE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    LIST_OPEN_SYMBOL,
    LIST_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
    SET_CLOSE_SYMBOL,
    TABLE_OPEN_SYMBOL,
    BIND_SYMBOL,
    ACCESS_SYMBOL,
    BASE_SYMBOL,
    FUNCTION_SYMBOL,
    BORROW_SYMBOL,
    SHARE_SYMBOL,
    DOCS_SYMBOL,
    NONE_SYMBOL,
    TYPE_SYMBOL,
    TYPE_VAR_SYMBOL,
    REACTION_SYMBOL,
    PREVIOUS_SYMBOL,
    CONVERT_SYMBOL,
    PLACEHOLDER_SYMBOL,
    TRUE_SYMBOL,
    FALSE_SYMBOL,
    NOT_SYMBOL,
    LANGUAGE_SYMBOL,
    THIS_SYMBOL,
    ALIAS_SYMBOL
];

const TEXT_SEPARATORS = "'‘’\"“”„«»‹›「」『』";
const OPERATORS = '+\\-×·÷%^<≤=≠≥>∧∨¬√~\?\\u2200-\\u22FF\\u2A00-\\u2AFF\\u2190-\\u21FF\\u27F0-\\u27FF\\u2900-\\u297F';

export const BinaryOpRegEx = new RegExp(`^[${OPERATORS}]`, "u");

function escapeRegexCharacter(c: string) { return /[\\\/\(\)\[\]\{\}]/.test(c) ? "\\" + c : c }

const patterns = [
    { pattern: LIST_OPEN_SYMBOL, types: [ TokenType.LIST_OPEN ] },
    { pattern: LIST_CLOSE_SYMBOL, types: [ TokenType.LIST_CLOSE ] },
    { pattern: SET_OPEN_SYMBOL, types: [ TokenType.SET_OPEN ] },
    { pattern: SET_CLOSE_SYMBOL, types: [ TokenType.SET_CLOSE ] },
    { pattern: ALIAS_SYMBOL, types: [ TokenType.ALIAS ] },
    { pattern: LANGUAGE_SYMBOL, types: [ TokenType.LANGUAGE ] },
    { pattern: "|?", types: [ TokenType.SELECT] },
    { pattern: "|+", types: [ TokenType.INSERT] },
    { pattern: "|-", types: [ TokenType.DELETE] },  
    { pattern: "|:", types: [ TokenType.UPDATE] },
    { pattern: TABLE_CLOSE_SYMBOL, types: [ TokenType.TABLE_CLOSE] },
    { pattern: TABLE_OPEN_SYMBOL, types: [ TokenType.TABLE_OPEN] },
    { pattern: BIND_SYMBOL, types: [ TokenType.BIND ] },
    { pattern: ACCESS_SYMBOL, types: [ TokenType.ACCESS ] },
    { pattern: FUNCTION_SYMBOL, types: [ TokenType.FUNCTION ] },
    { pattern: BORROW_SYMBOL, types: [ TokenType.BORROW ] },
    { pattern: SHARE_SYMBOL, types: [ TokenType.SHARE ] },
    { pattern: CONVERT_SYMBOL, types: [ TokenType.CONVERT ] },
    { pattern: THIS_SYMBOL, types: [ TokenType.THIS ] },
    { pattern: new RegExp(`^${DOCS_SYMBOL}.*?${DOCS_SYMBOL}`), types: [ TokenType.DOCS ] },
    { pattern: NONE_SYMBOL, types: [ TokenType.NONE, TokenType.NONE_TYPE ] },
    { pattern: TYPE_SYMBOL, types: [ TokenType.TYPE, TokenType.TYPE_OP, TokenType.UNION ] },
    { pattern: TYPE_VAR_SYMBOL, types: [ TokenType.TYPE_VAR ] },
    { pattern: REACTION_SYMBOL, types: [ TokenType.REACTION, TokenType.STREAM_TYPE ] },
    { pattern: PREVIOUS_SYMBOL, types: [ TokenType.PREVIOUS ] },
    { pattern: PLACEHOLDER_SYMBOL, types: [ TokenType.PLACEHOLDER ] },
    // Roman numerals
    { pattern: /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+/, types: [ TokenType.NUMBER, TokenType.ROMAN ] },
    // Japanese numbers
    { pattern: /^[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/u, types: [ TokenType.NUMBER, TokenType.JAPANESE ] },
    // Numbers with bases between base 2 and 16
    { pattern: /^([2-9]|1[0-6]);[_0-9A-F]+([.,][_0-9A-F]+)?/, types: [ TokenType.NUMBER, TokenType.BASE ] },    
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    { pattern: /^[_0-9]+([.,][_0-9]+)?%?/, types: [ TokenType.NUMBER, TokenType.DECIMAL ] },    
    { pattern: "π", types: [ TokenType.NUMBER, TokenType.PI ] },
    { pattern: "∞", types: [ TokenType.NUMBER, TokenType.INFINITY ] },
    { pattern: TRUE_SYMBOL, types: [ TokenType.BOOLEAN ] },
    { pattern: FALSE_SYMBOL, types: [ TokenType.BOOLEAN ] },
    // Match empty strings as both text and text types.
    { pattern: /^(""|''|“”|„“|‘’|«»|「」|『』)/u, types: [ TokenType.TEXT, TokenType.TEXT_TYPE ] },
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
    { pattern: /^".*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^“.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^„.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^'.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^‘.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^‹.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^«.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^「.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^『.*?(\\|(?=\n))/u, types: [ TokenType.TEXT_OPEN ] },
    // Lazily match closing strings that don't contain another opening string. This alllows betweens to match.
    { pattern: /^\\[^\\]*?("|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?(”|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\\[^\\]*?('|(?=\n))/u, types: [ TokenType.TEXT_CLOSE ] },
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
    { pattern: new RegExp(`^[${OPERATORS}](?! )`, "u"), types: [ TokenType.UNARY_OP ] },
    { pattern: BinaryOpRegEx, types: [ TokenType.BINARY_OP ] },
    // All other tokens are names, which are sequences of Unicode glyphs that are not one of the reserved symbols above or whitespace.
    { 
        pattern: new RegExp(`^[^\n\t ${RESERVED_SYMBOLS.map(s => escapeRegexCharacter(s)).join("")}${TEXT_SEPARATORS}${OPERATORS}]+`, "u"), 
        types: [ TokenType.NAME ] 
    }
];

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    while(source.length > 0) {
        const nextToken = getNextToken(source);
        if(nextToken === undefined) break;
        // Trim the token off the source.
        source = source.substring(nextToken.text.toString().length + nextToken.getWhitespace().length);
        tokens.push(nextToken);
    }

    // If there's nothing left -- or nothing but whitespace -- and the last token isn't a already end token, add one.
    if(tokens.length === 0 || !tokens[tokens.length - 1].is(TokenType.END))
        tokens.push(new Token("", TokenType.END));

    return tokens;
}

function getNextToken(source: string): Token | undefined {

    // Is there a series of space or tabs?
    const spaceMatch = source.match(/^[ \t\n]+/);
    const space = spaceMatch === null ? "" : spaceMatch[0];
    const trimmedSource = source.substring(space.length);

    // If there's nothing left, return an end of file token.
    if(trimmedSource.length === 0) return new Token("", TokenType.END, space);

    // See if one of the more complex regular expression patterns matches.
    for(let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        // If it's a string pattern, just see if the source starts with it.
        if(typeof pattern.pattern === 'string' && trimmedSource.startsWith(pattern.pattern))
            return new Token(pattern.pattern, pattern.types, space);
        else if(pattern.pattern instanceof RegExp) {
            const match = trimmedSource.match(pattern.pattern);
            // If we found a match, then return it.
            if(match !== null)
                return new Token(match[0], pattern.types, space);
        }
    }
    
    // Otherwise, we fail and return an error token that contains all of the text until the next whitespace.
    let nextSpace = 0;
    for(; nextSpace < trimmedSource.length; nextSpace++) {
        const char = trimmedSource.charAt(nextSpace);
        if(char === " " || char === "\t" || char === "\n") break;
    }
    return new Token(trimmedSource.substring(0, nextSpace), TokenType.UNKNOWN, space);

}