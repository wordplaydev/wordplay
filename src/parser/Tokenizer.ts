import { Token, TokenType } from "./Token";

const patterns = [
    { pattern: "[", types: [ TokenType.LIST_OPEN ] },
    { pattern: "]", types: [ TokenType.LIST_CLOSE ] },
    { pattern: "{", types: [ TokenType.SET_OPEN ] },
    { pattern: "}", types: [ TokenType.SET_CLOSE ] },
    { pattern: "/", types: [ TokenType.TYPE_VARS, TokenType.LANGUAGE ] },
    { pattern: "|?", types: [ TokenType.SELECT] },
    { pattern: "|+", types: [ TokenType.INSERT] },
    { pattern: "|-", types: [ TokenType.DELETE] },
    { pattern: "|:", types: [ TokenType.UPDATE] },
    { pattern: "|", types: [ TokenType.TABLE] },
    { pattern: ":", types: [ TokenType.BIND ] },
    { pattern: ".", types: [ TokenType.ACCESS ] },
    { pattern: "ƒ", types: [ TokenType.FUNCTION ] },
    { pattern: "↓", types: [ TokenType.BORROW ] },
    { pattern: "↑", types: [ TokenType.SHARE ] },
    { pattern: "→", types: [ TokenType.CONVERT ] },
    { pattern: /^`.*?`/, types: [ TokenType.DOCS ] },
    { pattern: "!", types: [ TokenType.NONE, TokenType.NONE_TYPE ] },
    { pattern: "•", types: [ TokenType.TYPE ] },
    { pattern: "∆", types: [ TokenType.STREAM ] },
    { pattern: "…", types: [ TokenType.TBD ] },
    // Tokenize numbers before - gets slurped up, to allow for negative numbers.
    { pattern: /^-?[0-9]+([.,][0-9]+)?/, types: [ TokenType.NUMBER ] },
    { pattern: /^[π∞]/, types: [ TokenType.NUMBER ] },
    { pattern: /^[-+×*·^÷%<>≤≥=≠]/u, types: [ TokenType.BINARY_OP ] },
    { pattern: "∧", types: [ TokenType.BINARY_OP ] },
    { pattern: "∨", types: [ TokenType.BINARY_OP, TokenType.UNION ] },
    { pattern: /^[-~√¬]/, types: [ TokenType.BINARY_OP, TokenType.UNARY_OP ] },
    { pattern: "⊤", types: [ TokenType.BOOLEAN ] },
    { pattern: "⊥", types: [ TokenType.BOOLEAN ] },
    // Also match the open and close patterns before the regular text patterns.
    // Note that we explicitly exclude • from text so that we can use text
    // delimiters in type declarations. Without excluding them, we wouldn't be able to
    // write consecutive function input type declarations that include text types.
    { pattern: /^(""|''|“”|„“|‘’|«»|「」|『』)/u, types: [ TokenType.TEXT, TokenType.TEXT_TYPE ] },
    { pattern: /^".*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^“.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^„.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^'.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^‘.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^‹.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^«.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^「.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^『.*?(?<!\\)\(/u, types: [ TokenType.TEXT_OPEN ] },
    { pattern: /^\)[^\)]*?』/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\)[^\)]*?」/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\)[^\)]*?»/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\)[^\)]*?›/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\)[^\)]*?'/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\)[^\)]*?’/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\)[^\)]*?"/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: /^\)[^\)]*?”/u, types: [ TokenType.TEXT_CLOSE ] },
    { pattern: "(", types: [ TokenType.EVAL_OPEN ] },
    { pattern: ")", types: [ TokenType.EVAL_CLOSE ] },
    // Match this after the eval close to avoid capturing function evaluations in templates.
    { pattern: /^(?<!\\)\)[^\)]*?(?<!\\)\(/, types: [ TokenType.TEXT_BETWEEN ] },
    { pattern: /^".*?"/u, types: [ TokenType.TEXT ] },
    { pattern: /^“.*?”/u, types: [ TokenType.TEXT ] },
    { pattern: /^„.*?“/u, types: [ TokenType.TEXT ] },
    { pattern: /^'.*?'/u, types: [ TokenType.TEXT ] },
    { pattern: /^‘.*?’/u, types: [ TokenType.TEXT ] },
    { pattern: /^‘.*?’/u, types: [ TokenType.TEXT ] },
    { pattern: /^‹.*?›/u, types: [ TokenType.TEXT ] },
    { pattern: /^«.*?»/u, types: [ TokenType.TEXT ] },
    { pattern: /^「.*?」/u, types: [ TokenType.TEXT ] },
    { pattern: /^『.*?』/u, types: [ TokenType.TEXT ] },
    // Match primtive types after strings since one is a standalone quote symbol.
    { pattern: "#", types: [ TokenType.NUMBER_TYPE ] },
    { pattern: /^[?¿]/, types: [ TokenType.BOOLEAN_TYPE, TokenType.CONDITIONAL ] },
    // One or more unicode characters that are not one of the reserved symbols above.
    { pattern: /^[^\(\)\[\]\{\}|:.,ƒ↓↑`!•∆… \t\n+\-×*·^√÷%<≤=≠≥>⊥⊤~¬∧∨'‘’"“”„«»‹›「」『』\/]+/u, types: [ TokenType.NAME ] }
];

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let index = 0;
    let precedingTextOpen = false;
    while(source.length > 0) {
        const nextToken = getNextToken(source, index, precedingTextOpen);
        if(nextToken === undefined) break;
        const length = nextToken.getLength() + nextToken.getPrecedingSpace().length;
        source = source.substring(length);
        tokens.push(nextToken);
        index += length;
        if(nextToken.is(TokenType.TEXT_OPEN))
            precedingTextOpen = true;
        else if(nextToken.is(TokenType.TEXT_CLOSE))
            precedingTextOpen = false;
    }

    // If there's nothing left and the last token isn't an end token, add one.
    if(tokens.length === 0 || !tokens[tokens.length - 1].is(TokenType.END))
        tokens.push(new Token("", [ TokenType.END ], index));

    return tokens;
}

function getNextToken(source: string, index: number, precedingTextOpen: boolean): Token | undefined {

    // Is there a series of space or tabs?
    const spaceMatch = source.match(/^[ \t\n]+/);
    const space = spaceMatch === null ? "" : spaceMatch[0];
    const trimmedSource = source.substring(space.length);
    const startIndex = index + space.length;

    // If there's nothing left, return an end of file token.
    if(trimmedSource.length === 0) return new Token("", [ TokenType.END ], startIndex, space);

    // See if one of the more complex regular expression patterns matches.
    for(let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        // If it's a string pattern, just see if the source starts with it.
        if(typeof pattern.pattern === 'string' && trimmedSource.startsWith(pattern.pattern))
            return new Token(pattern.pattern, pattern.types, startIndex, space);
        else if(pattern.pattern instanceof RegExp) {
            const match = trimmedSource.match(pattern.pattern);
            // If we found a match and it's either not a text close or it is and there's a corresponding text open
            // that hasn't been closed, then return the match.
            if(match !== null && (!(pattern.types.includes(TokenType.TEXT_BETWEEN) || pattern.types.includes(TokenType.TEXT_CLOSE)) || precedingTextOpen))
                return new Token(match[0], pattern.types, startIndex, space);
        }
    }
    
    // Otherwise, we fail and return an error token that contains the remainder of the text.
    return new Token(source, [ TokenType.UNKNOWN ], startIndex, space);

}