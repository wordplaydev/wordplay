import Node from "./Node";

export enum TokenType {
    EVAL_OPEN,  // (
    EVAL_CLOSE, // )
    SET_OPEN,   // {
    SET_CLOSE,  // }
    LIST_OPEN,  // [
    LIST_CLOSE, // ]
    MAP_OPEN,   // [
    MAP_CLOSE,  // ]
    COLUMN,     // |
    BIND,       // :
    ACCESS,     // .
    FUNCTION,   // ƒ
    BORROW,     // ↓
    SHARE,      // ↑
    DOCS,       // `
    ERROR,      // !
    TYPE,       // •
    PRIMITIVE,  // ?"#!
    UNION,      // |
    // These are the only operators eligible for unary or infix notation.
    // We’ve included them for consistency with math notation.
    BINARY,     // +-×÷%<≤≥>&|
    UNARY,      // ~
    STREAM,     // …
    // Also supports escapes with \to encode various characters
    // The trailing text at the end encodes the format.
    // Text literals can also come in multiple formats, to encode multilingual apps in place.
    TEXT,       // ‘“«„“「‹(.*)‘”»”」›
    TEXT_OPEN,
    TEXT_BETWEEN,
    TEXT_CLOSE,
    LANGUAGE,   // /[a-z]{3} (ISO 639-2: https://en.wikipedia.org/wiki/ISO_639-2
    // The optional negative sign allows for negative number literals.
    // The optional dash allows for a random number range.
    // The trailing text at the end encodes the unit.
    // Both commas and periods are allowed to cover different conventions globally.
    NUMBER,     // -?[0-9]+([.,][0-9]+)?(-[0-9]+([.,][0-9]+)?)[^\s]*
    BOOLEAN,    // \u22a4 (true) \u22a5 (false)
    SPACE,      // [ \t]+
    LINES,       // \n
    NAME,       // .+
    OOPS,        // Represents any characters that couldn't be tokenized.
    END
}

export class Token extends Node {
    /** The one or more types of token this might represent. */
    readonly types: TokenType[];
    /** The text of the token */
    readonly text: string;
    /** The index in the source file at which this token starts. */
    readonly index: number;

    constructor(text: string, types: TokenType[], index: number) {
        super();
        this.types = types.slice();
        this.text = text;
        this.index = index;
    }
    getIndex() { return this.index; }
    getLength() { return this.text.length; }
    getChildren() { return []; }
    isnt(type: TokenType) { return !this.is(type); }
    is(type: TokenType) { return this.types.includes(type); }
    isName() { return this.is(TokenType.NAME); }
    toString(depth: number=0){ return `${"\t".repeat(depth)}${this.types.map(t => TokenType[t]).join('/')}(${this.index}): ${this.text.replaceAll("\n", "\\n").replaceAll("\t", "\\t")}`; }
    toWordplay() { return this.text; }
}