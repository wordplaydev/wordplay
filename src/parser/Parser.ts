import Program from "./Program";

enum TokenType {
    EXPR_OPEN,  // (
    EXPR_CLOSE, // )
    SET_OPEN,   // {
    SET_CLOSE,  // }
    LIST_OPEN,  // [
    LIST_CLOSE, // ]
    BIND,       // :
    ACCESS,     // .
    FUNCTION,   // ƒ
    BORROW,     // ↓
    SHARE,      // ↑
    DOCS,       // `
    ERROR,      // !
    TYPE,       // •
    // These are the only operators eligible for unary or infix notation.
    // We’ve included them for consistency with math notation.
    OPERATOR,  // +-×÷%<≤≥>&|~
    STREAM,     // …
    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    TEXT,       // ‘“«„“「‹(.*)‘”»”」›
    LANGUAGE,   // /[a-z]{3} (ISO 639-2: https://en.wikipedia.org/wiki/ISO_639-2
    // The optional negative sign allows for negative number literals.
    // The optional dash allows for a random number range.
    // The trailing text at the end encodes the unit.
    // Both commas and periods are allowed to cover different conventions globally.
    NUMBER,     // -?[0-9]+([.,][0-9]+)?(-[0-9]+([.,][0-9]+)?)[^\s]*
    BOOLEAN,    // 🙂🙃
    SPACE,      // [ \t]+
    LINES,       // \n
    NAME,       // .+
    OOPS        // Represents any characters that couldn't be tokenized.
}

class Token {
    readonly type: TokenType;
    readonly text: string;
    constructor(type: TokenType, text: string) {
        this.type = type;
        this.text = text;
    }
    getLength() { return this.text.length; }
    toWordplay() { return this.text }
}

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    while(source.length > 0) {
        const nextToken = getNextToken(source);
        tokens.push(nextToken);
        source = source.substring(nextToken.getLength());
    }
    return tokens;
}

const patterns = [
    { pattern: "(", type: TokenType.EXPR_OPEN },
    { pattern: ")", type: TokenType.EXPR_CLOSE },
    { pattern: "[", type: TokenType.LIST_OPEN },
    { pattern: "]", type: TokenType.LIST_CLOSE },
    { pattern: "{", type: TokenType.SET_OPEN },
    { pattern: "}", type: TokenType.SET_CLOSE },
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
    { pattern: "+", type: TokenType.OPERATOR },
    { pattern: "-", type: TokenType.OPERATOR },
    { pattern: "×", type: TokenType.OPERATOR },
    { pattern: "÷", type: TokenType.OPERATOR },
    { pattern: "%", type: TokenType.OPERATOR },
    { pattern: "<", type: TokenType.OPERATOR },
    { pattern: ">", type: TokenType.OPERATOR },
    { pattern: "≤", type: TokenType.OPERATOR },
    { pattern: "≥", type: TokenType.OPERATOR },
    { pattern: "&", type: TokenType.OPERATOR },
    { pattern: "|", type: TokenType.OPERATOR },
    { pattern: "~", type: TokenType.OPERATOR },
    { pattern: "🙂", type: TokenType.BOOLEAN },
    { pattern: "🙃", type: TokenType.BOOLEAN },
    { pattern: /^\n+/, type: TokenType.LINES },
    { pattern: /^[ \t]+/, type: TokenType.SPACE },
    { pattern: /^["“”„].*?["“”]/u, type: TokenType.TEXT },
    { pattern: /^['‘’].*?['‘’]/u, type: TokenType.TEXT },
    { pattern: /^‹.*?›/u, type: TokenType.TEXT },
    { pattern: /^«.*?»/u, type: TokenType.TEXT },
    { pattern: /^「.*?」/u, type: TokenType.TEXT },
    { pattern: /^『.*?』/u, type: TokenType.TEXT },
    { pattern: /^\/[a-z]{3}/, type: TokenType.LANGUAGE },
    // One or more unicode characters that are not one of the reserved characters
    { pattern: /^[^\(\)\[\]\{\}:.ƒ↓↑`!•… \t\n+\-×÷%<≤≥>~&|'‘’"“”„«»‹›「」『』🙂🙃\/]+/u, type: TokenType.NAME }
];

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

export function parse(tokens: Token[]): Program {

    return new Program(tokens.map(t => t.toWordplay()).join(""));

}