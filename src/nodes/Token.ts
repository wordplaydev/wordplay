import UnicodeString from "../models/UnicodeString";
import Node from "./Node";
import TokenType from "./TokenType";

export const TAB_WIDTH = 2;

export default class Token extends Node {
    
    /** The one or more types of token this might represent. This is narrowed during parsing to one.*/
    readonly types: TokenType[];
    /** The text of the token */
    readonly text: UnicodeString;
    /** Spaces and tabs preceding this token. */
    readonly whitespace: string | undefined;
    /** The index in the source file at which this token starts. */
    readonly index: number | undefined;
    /** The precomputed number of newlines in the whitespace */
    readonly newlines: number;
    /** The precomputed number of spaces on the row containing the non-whitespace text */
    readonly precedingSpaces: number;

    constructor(text: string | UnicodeString, types: TokenType[], index?: number | undefined, space?: string) {
        super();

        this.types = [ ... types ];

        // Ensure tokens are canonically structred. from a unicode perspective.
        this.text = text instanceof UnicodeString ? text : new UnicodeString(text);
        this.whitespace = space;
        this.index = index;

        // Split the whitespace by lines, then tabs.
        const lines = this.whitespace?.split("\n");
        // Compute the number of newlines overall.
        this.newlines = lines === undefined ? 0 : lines.length - 1;
        // Compute the number of spaces on the last line.
        this.precedingSpaces = lines === undefined ? 0 : lines[lines.length - 1].split("").reduce((sum, s) => sum + (s === "\t" ? TAB_WIDTH : s === " " ? 1 : 0), 0);

    }

    getText() { return this.text.toString(); }
    computeChildren() { return []; }
    getWhitespaceIndex() { return this.index === undefined || this.whitespace === undefined ? undefined : this.index - this.whitespace.length; }
    getTextIndex() { return this.index; }
    getLastIndex() { return this.index === undefined ? undefined : this.index + this.getTextLength(); }
    /* Property accounts for unicode codepoints */
    getTextLength() { return this.text.getLength(); }
    getWhitespace() { return this.whitespace === undefined ? "" : this.whitespace; }
    hasWhitespace() { return this.whitespace === undefined ? false : this.whitespace.length > 0; }
    containsPosition(position: number) { return this.whitespace == undefined || this.index === undefined ? false : position >= this.index - this.whitespace.length && position <= this.index + this.getTextLength(); }
    hasPrecedingLineBreak() { return this.whitespace === undefined ? false : this.whitespace.includes("\n"); }
    isnt(type: TokenType) { return !this.is(type); }
    is(type: TokenType) { return this.types.includes(type); }
    isName() { return this.is(TokenType.NAME); }
    withTypeNarrowedTo(type: TokenType) {
        if(this.is(type))
            return new Token(this.text, [ type ], this.index, this.whitespace);
        else
            throw Error(`Invalid narrowing of token from ${this.types} to ${type}`);
    }
    toString(depth: number=0){ return `${"\t".repeat(depth)}${this.types.map(t => TokenType[t]).join('/')}(${this.whitespace === undefined ? 0 : this.whitespace.length},${this.index}): ${this.text.toString().replaceAll("\n", "\\n").replaceAll("\t", "\\t")}`; }
    toWordplay() { return this.getWhitespace() + this.text.toString(); }
    computeConflicts() {}
    clone() { return new Token(this.text, this.types, this.index, this.whitespace) as this; }

    getDescriptions() {
        return {
            eng: "A token"
        }
    }

}