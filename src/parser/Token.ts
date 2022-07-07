import Node from "./Node";

export enum TokenType {
    EVAL_OPEN,  // (
    EVAL_CLOSE, // )
    SET_OPEN,   // {
    SET_CLOSE,  // }
    LIST_OPEN,  // [
    LIST_CLOSE, // ]
    COLUMN,     // |
    BIND,       // :
    ACCESS,     // .
    FUNCTION,   // ƒ
    BORROW,     // ↓
    SHARE,      // ↑
    DOCS,       // `
    OOPS,       // !
    TYPE,       // •
    TYPE_VARS,  // /
    BOOLEAN_TYPE, // ?
    TEXT_TYPE,  // '"‹‘“„«「
    NUMBER_TYPE,  // #
    OOPS_TYPE,  // !
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
    // The optional negative sign allows for negative number literals.
    // The optional dash allows for a random number range.
    // The trailing text at the end encodes the unit.
    // Both commas and periods are allowed to cover different conventions globally.
    NUMBER,     // -?[0-9]+([.,][0-9]+)?(-[0-9]+([.,][0-9]+)?)[^\s]*
    BOOLEAN,    // \u22a4 (true) \u22a5 (false)
    LINES,       // \n
    NAME,       // .+
    UNKNOWN,        // Represents any characters that couldn't be tokenized.
    END
}

export class Token extends Node {
    /** The one or more types of token this might represent. */
    readonly types: TokenType[];
    /** The text of the token */
    readonly text: string;
    /** Spaces and tabs preceding this token. */
    readonly space: string;
    /** The index in the source file at which this token starts. */
    readonly index: number;

    constructor(text: string, types: TokenType[], index: number, space: string="") {
        super();
        this.types = types.slice();
        this.text = text;
        this.space = space;
        this.index = index;
    }
    getIndex() { return this.index; }
    getLength() { return this.text.length; }
    getChildren() { return []; }
    getPrecedingSpace() { return this.space; }
    hasPrecedingSpace() { return this.space.length > 0; }
    isnt(type: TokenType) { return !this.is(type); }
    is(type: TokenType) { return this.types.includes(type); }
    isName() { return this.is(TokenType.NAME); }
    toString(depth: number=0){ return `${"\t".repeat(depth)}${this.types.map(t => TokenType[t]).join('/')}(${this.space.length},${this.index}): ${this.text.replaceAll("\n", "\\n").replaceAll("\t", "\\t")}`; }
    toWordplay() { return this.space + this.text; }
}