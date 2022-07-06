import { Token, TokenType } from "./Token";

const patterns = [
    { pattern: "[", types: [ TokenType.LIST_OPEN ] },
    { pattern: "]", types: [ TokenType.LIST_CLOSE ] },
    { pattern: "{", types: [ TokenType.SET_OPEN ] },
    { pattern: "}", types: [ TokenType.SET_CLOSE ] },
    { pattern: "<", types: [ TokenType.MAP_OPEN, TokenType.BINARY ] },
    { pattern: ">", types: [ TokenType.MAP_CLOSE, TokenType.BINARY ] },
    { pattern: "|", types: [ TokenType.BINARY, TokenType.UNION ] },
    { pattern: ":", types: [ TokenType.BIND ] },
    { pattern: ".", types: [ TokenType.ACCESS ] },
    { pattern: "ƒ", types: [ TokenType.FUNCTION ] },
    { pattern: "↓", types: [ TokenType.BORROW ] },
    { pattern: "↑", types: [ TokenType.SHARE ] },
    { pattern: "`", types: [ TokenType.DOCS ] },
    { pattern: "!", types: [ TokenType.ERROR ] },
    { pattern: "•", types: [ TokenType.TYPE ] },
    { pattern: "…", types: [ TokenType.STREAM ] },
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    { pattern: /^-?[0-9]+([.,][0-9]+)?/, types: [ TokenType.NUMBER ] },
    { pattern: /^[π∞]/, types: [ TokenType.NUMBER ] },
    { pattern: /^[-+×*^÷%≤≥=≠]/u, types: [ TokenType.BINARY ] },
    { pattern: /^[&|]/, types: [ TokenType.BINARY ] },
    { pattern: /^[-~√]/, types: [ TokenType.BINARY, TokenType.UNARY ] },
    { pattern: "⊤", types: [ TokenType.BOOLEAN ] },
    { pattern: "⊥", types: [ TokenType.BOOLEAN ] },
    { pattern: /^\n+/, types: [ TokenType.LINES ] },
    { pattern: /^[ \t]+/, types: [ TokenType.SPACE ] },
    // Also match the open and close patterns before the regular string patterns.
    { pattern: /^["“”„].*?["“”\(]/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^\)]*?["“”]/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^['‘’].*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^\)]*?['‘’]/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^‹.*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^\)]*?›/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^«.*?[»\(]/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^\)]*?»/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^「.*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^\)]*?」/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^『.*?\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^\)]*?』/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^['‘’].*?['‘’]/u, types: [ TokenType.TEXT ] },
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
    { pattern: /^[?#!'"‹‘“„«「]/u, types: [ TokenType.PRIMITIVE ] },
    { pattern: /^\/[a-z]{3}/, types: [ TokenType.LANGUAGE ] },
    // One or more unicode characters that are not one of the reserved characters
    { pattern: /^[^\(\)\[\]\{\}:.ƒ↓↑`!•… \t\n+\-×*^√÷%<≤=≠≥>~&|'‘’"“”„«»‹›「」『』🙂🙃\/]+/u, types: [ TokenType.NAME ] }
];

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    while(source.length > 0) {
        const nextToken = getNextToken(source);
        tokens.push(nextToken);
        source = source.substring(nextToken.getLength());
    }
    return tokens;
}

function getNextToken(source: string): Token {
    let c = source.charAt(0);
    // See if one of the more complex regular expression patterns matches.
    for(let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if(typeof pattern.pattern === 'string' && source.startsWith(pattern.pattern))
            return new Token(pattern.pattern, pattern.types);
        else if(pattern.pattern instanceof RegExp) {
            const match = source.match(pattern.pattern);
            if(match !== null)
                return new Token(match[0], pattern.types);
        }
    }

    // Otherwise, we fail and return an error token that contains the remainder of the text.
    return new Token(source, [ TokenType.OOPS ]);

}