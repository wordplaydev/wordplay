import { Token, TokenType } from "./Token";

const patterns = [
    { pattern: "[", type: TokenType.LIST_OPEN },
    { pattern: "]", type: TokenType.LIST_CLOSE },
    { pattern: "{", type: TokenType.SET_OPEN },
    { pattern: "}", type: TokenType.SET_CLOSE },
    { pattern: "<", type: TokenType.MAP_OPEN },
    { pattern: ">", type: TokenType.MAP_CLOSE },
    { pattern: ":", type: TokenType.BIND },
    { pattern: ".", type: TokenType.ACCESS },
    { pattern: "ƒ", type: TokenType.FUNCTION },
    { pattern: "↓", type: TokenType.BORROW },
    { pattern: "↑", type: TokenType.SHARE },
    { pattern: "`", type: TokenType.DOCS },
    { pattern: "!", type: TokenType.ERROR },
    { pattern: "•", type: TokenType.TYPE },
    { pattern: "…", type: TokenType.STREAM },
    // Tokenize numbers before - gets slurped up.
    { pattern: /^-?[0-9]+([.,][0-9]+)?/, type: TokenType.NUMBER },
    { pattern: "+", type: TokenType.BINARY },
    { pattern: "-", type: TokenType.BINARY },
    { pattern: "×", type: TokenType.BINARY },
    { pattern: "*", type: TokenType.BINARY },
    { pattern: "÷", type: TokenType.BINARY },
    { pattern: "%", type: TokenType.BINARY },
    { pattern: "<", type: TokenType.BINARY },
    { pattern: ">", type: TokenType.BINARY },
    { pattern: "≤", type: TokenType.BINARY },
    { pattern: "≥", type: TokenType.BINARY },
    { pattern: "&", type: TokenType.BINARY },
    { pattern: "|", type: TokenType.BINARY },
    { pattern: "~", type: TokenType.UNARY },
    { pattern: "⊤", type: TokenType.BOOLEAN },
    { pattern: "⊥", type: TokenType.BOOLEAN },
    { pattern: /^\n+/, type: TokenType.LINES },
    { pattern: /^[ \t]+/, type: TokenType.SPACE },
    // Also match the open and close patterns before the regular string patterns.
    { pattern: /^\)[^\)]*?\(/, type: TokenType.TEXT_BETWEEN },
    { pattern: /^["“”„].*?["“”\(]/u, type: TokenType.TEXT_OPEN },
    { pattern: /^\)[^\)]*?["“”]/u, type: TokenType.TEXT_CLOSE },
    { pattern: /^['‘’].*?\(/u, type: TokenType.TEXT_OPEN },
    { pattern: /^\)[^\)]*?['‘’]/u, type: TokenType.TEXT_CLOSE },
    { pattern: /^‹.*?\(/u, type: TokenType.TEXT_OPEN },
    { pattern: /^\)[^\)]*?›/u, type: TokenType.TEXT_CLOSE },
    { pattern: /^«.*?[»\(]/u, type: TokenType.TEXT_OPEN },
    { pattern: /^\)[^\)]*?»/u, type: TokenType.TEXT_CLOSE },
    { pattern: /^「.*?\(/u, type: TokenType.TEXT_OPEN },
    { pattern: /^\)[^\)]*?」/u, type: TokenType.TEXT_CLOSE },
    { pattern: /^『.*?\(/u, type: TokenType.TEXT_OPEN },
    { pattern: /^\)[^\)]*?』/u, type: TokenType.TEXT_CLOSE },
    { pattern: /^['‘’].*?['‘’]/u, type: TokenType.TEXT },
    { pattern: /^‹.*?›/u, type: TokenType.TEXT },
    { pattern: /^«.*?»/u, type: TokenType.TEXT },
    { pattern: /^「.*?」/u, type: TokenType.TEXT },
    { pattern: /^『.*?』/u, type: TokenType.TEXT },
    // Match all of the string open/close patterns before matching just an open or close parenthesis.
    { pattern: "(", type: TokenType.EVAL_OPEN },
    { pattern: ")", type: TokenType.EVAL_CLOSE },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: /^[?#!'"‹‘“„«「]/u, type: TokenType.PRIMITIVE },
    { pattern: /^\/[a-z]{3}/, type: TokenType.LANGUAGE },
    // One or more unicode characters that are not one of the reserved characters
    { pattern: /^[^\(\)\[\]\{\}:.ƒ↓↑`!•… \t\n+\-×÷%<≤≥>~&|'‘’"“”„«»‹›「」『』🙂🙃\/]+/u, type: TokenType.NAME }
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
            return new Token(pattern.type, pattern.pattern);
        else if(pattern.pattern instanceof RegExp) {
            const match = source.match(pattern.pattern);
            if(match !== null)
                return new Token(pattern.type, match[0]);
        }
    }

    // Otherwise, we fail and return an error token that contains the remainder of the text.
    return new Token(TokenType.OOPS, source);

}