import { Token, TokenType } from "./Token";

const patterns = [
    { pattern: "[", types: [ TokenType.LIST_OPEN ] },
    { pattern: "]", types: [ TokenType.LIST_CLOSE ] },
    { pattern: "{", types: [ TokenType.SET_OPEN ] },
    { pattern: "}", types: [ TokenType.SET_CLOSE ] },
    { pattern: "|", types: [ TokenType.BINARY, TokenType.UNION ] },
    { pattern: ":", types: [ TokenType.BIND ] },
    { pattern: ".", types: [ TokenType.ACCESS ] },
    { pattern: /^[ƒf]/, types: [ TokenType.FUNCTION ] },
    { pattern: "↓", types: [ TokenType.BORROW ] },
    { pattern: "↑", types: [ TokenType.SHARE ] },
    { pattern: "`", types: [ TokenType.DOCS ] },
    { pattern: "!", types: [ TokenType.OOPS, TokenType.OOPS_TYPE ] },
    { pattern: "•", types: [ TokenType.TYPE ] },
    { pattern: "/", types: [ TokenType.TYPE_VARS ] },
    { pattern: "…", types: [ TokenType.STREAM ] },
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    { pattern: /^-?[0-9]+([.,][0-9]+)?/, types: [ TokenType.NUMBER ] },
    { pattern: /^[π∞]/, types: [ TokenType.NUMBER ] },
    { pattern: /^[-+×*^÷%<>≤≥=≠]/u, types: [ TokenType.BINARY ] },
    { pattern: /^[&|]/, types: [ TokenType.BINARY ] },
    { pattern: /^[-~√]/, types: [ TokenType.BINARY, TokenType.UNARY ] },
    { pattern: "⊤", types: [ TokenType.BOOLEAN ] },
    { pattern: "⊥", types: [ TokenType.BOOLEAN ] },
    // We don't allow whitespace in any tokens; this means no multi-line strings.
    { pattern: /^\n+/, types: [ TokenType.LINES ] },
    // Also match the open and close patterns before the regular text patterns.
    // Note that we explicitly exclude • from text so that we can use text
    // delimiters in type declarations. Without excluding them, we wouldn't be able to
    // write consecutive function input type declarations that include text types.
    { pattern: /^["“”„][^•]*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^•\)]*?["“”]/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^['‘’][^•]*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^•\)]*?['‘’]/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^‹[^•]?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^•\)]*?›/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^«[^•]*?[»\(]/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^•\)]*?»/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^「[^•]*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^•\)]*?」/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^『[^•]*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^•\)]*?』/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^["“”„][^•]*?["“”]/u, types: [ TokenType.TEXT ] },
    { pattern: /^['‘’][^•]*?['‘’]/u, types: [ TokenType.TEXT ] },
    { pattern: /^‹.*?›/u, types: [ TokenType.TEXT ] },
    { pattern: /^«.*?»/u, types: [ TokenType.TEXT ] },
    { pattern: /^「.*?」/u, types: [ TokenType.TEXT ] },
    { pattern: /^『.*?』/u, types: [ TokenType.TEXT ] },
    // Match all of the string open/close patterns before matching just an open or close parenthesis.
    { pattern: "(", types: [ TokenType.EVAL_OPEN ] },
    { pattern: ")", types: [ TokenType.EVAL_CLOSE ] },
    // Match this after the eval close to avoid capturing function evaluations in templates.
    { pattern: /^\)[^\)]*?\(/, types: [ TokenType.TEXT_BETWEEN ] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: "#", types: [ TokenType.NUMBER_TYPE ] },
    { pattern: "?", types: [ TokenType.BOOLEAN_TYPE ] },
    { pattern: /^['"‹‘“„«「]/u, types: [ TokenType.TEXT_TYPE ] },
    // One or more unicode characters that are not one of the reserved characters
    { pattern: /^[^\(\)\[\]\{\}:.ƒ↓↑`!•… \t\n+\-×*^√÷%<≤=≠≥>~&|'‘’"“”„«»‹›「」『』🙂🙃\/]+/u, types: [ TokenType.NAME ] }
];

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let index = 0;
    while(source.length > 0) {
        const nextToken = getNextToken(source, index);
        if(nextToken === undefined) break;
        const length = nextToken.getLength() + nextToken.getPrecedingSpace().length;
        source = source.substring(length);
        tokens.push(nextToken);
        index += length;
    }
    return tokens;
}

function getNextToken(source: string, index: number): Token | undefined {

    // Is there a series of space or tabs?
    const spaceMatch = source.match(/^[ \t]+/);
    const space = spaceMatch === null ? "" : spaceMatch[0];
    const trimmedSource = source.substring(space.length);
    const startIndex = index + space.length;

    if(trimmedSource.length === 0) return;

    // See if one of the more complex regular expression patterns matches.
    for(let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        // If it's a string pattern, just see if the source starts with it.
        if(typeof pattern.pattern === 'string' && trimmedSource.startsWith(pattern.pattern))
            return new Token(pattern.pattern, pattern.types, startIndex, space);
        else if(pattern.pattern instanceof RegExp) {
            const match = trimmedSource.match(pattern.pattern);
            if(match !== null)
                return new Token(match[0], pattern.types, startIndex, space);
        }
    }
    
    // Otherwise, we fail and return an error token that contains the remainder of the text.
    return new Token(source, [ TokenType.UNKNOWN ], startIndex, space);

}