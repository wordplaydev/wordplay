import UnicodeString from "../models/UnicodeString";
import Node from "./Node";
import TokenType from "./TokenType";

export const TAB_WIDTH = 2;

export default class Token extends Node {
    
    /** The one or more types of token this might represent. This is narrowed during parsing to one.*/
    readonly types: TokenType | TokenType[];
    /** The text of the token */
    readonly text: UnicodeString;
    /** Spaces and tabs preceding this token. */
    readonly space: string;

    /** CACHE: The precomputed number of newlines in the whitespace */
    readonly newlines: number;
    /** CACHE: The precomputed number of spaces on the row containing the non-whitespace text */
    readonly precedingSpaces: number;

    constructor(text: string | UnicodeString, types: TokenType | TokenType[], space: string="") {
        super();

        this.types = types;

        // Ensure tokens are canonically structred. from a unicode perspective.
        this.text = text instanceof UnicodeString ? text : new UnicodeString(text);
        this.space = space;

        // Split the whitespace by lines, then tabs.
        const lines = this.space?.split("\n");
        // Compute the number of newlines overall.
        this.newlines = lines === undefined ? 0 : lines.length - 1;
        // Compute the number of spaces on the last line.
        this.precedingSpaces = lines === undefined ? 0 : lines[lines.length - 1].split("").reduce((sum, s) => sum + (s === "\t" ? TAB_WIDTH : s === " " ? 1 : 0), 0);

    }

    getText() { return this.text.toString(); }
    computeChildren() { return []; }
    /* Property accounts for unicode codepoints */
    getTextLength() { return this.text.getLength(); }
    getWhitespace() { return this.space === undefined ? "" : this.space; }
    hasWhitespace() { return this.space === undefined ? false : this.space.length > 0; }
    hasNewline() { return this.newlines > 0; }

    hasPrecedingLineBreak() { return this.space === undefined ? false : this.space.includes("\n"); }
    isnt(type: TokenType) { return !this.is(type); }
    is(type: TokenType) { return Array.isArray(this.types) ? this.types.includes(type) : type === this.types; }
    isName() { return this.is(TokenType.NAME); }
    withTypeNarrowedTo(type: TokenType) {
        if(this.is(type))
            return new Token(this.text, type, this.space);
        else
            throw Error(`Invalid narrowing of token from ${this.types} to ${type}`);
    }
    toString(depth: number=0){ return `${"\t".repeat(depth)}${Array.isArray(this.types) ? this.types.map(t => TokenType[t]).join('/') : TokenType[this.types]}(${this.space.length}): ${this.text.toString().replaceAll("\n", "\\n").replaceAll("\t", "\\t")}`; }
    toWordplay() { return this.getWhitespace() + this.text.toString(); }
    computeConflicts() {}
    clone(pretty: boolean, original?: Node, replacement?: Node): this {
        pretty;
        if(original === this && replacement instanceof Token) return replacement as this;
        else return new Token(this.text, this.types, this.space) as this; 
    }

    getDescriptions() {
        return {
            eng: this.is(TokenType.NAME) ? "A name" : 
                this.is(TokenType.BINARY_OP) || this.is(TokenType.UNARY_OP) ? "An operator" :
                this.is(TokenType.DOCS) ? "Documentation" :
                this.is(TokenType.JAPANESE) || this.is(TokenType.ROMAN) || this.is(TokenType.NUMBER) || this.is(TokenType.PI) || this.is(TokenType.INFINITY) ? "A number" :            
                "A token"
        }
    }

    withSpace(space: string) {
        return new Token(this.text, this.types, space);
    }

    withPrecedingSpace(space: string=" ", exact: boolean=false): this {

        if(exact ? this.space !== space : this.space.length === 0)
            return this.withSpace(space) as this;
        else return this;

    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getFirstPlaceholder(): Node | undefined {
        return this.is(TokenType.PLACEHOLDER) ? this : undefined;
    }

}