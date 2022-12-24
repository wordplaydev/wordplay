import UnicodeString from "../models/UnicodeString";
import type Spaces from "../parser/Spaces";
import Node from "./Node";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Token extends Node {
    
    /** The one or more types of token this might represent. This is narrowed during parsing to one.*/
    readonly types: TokenType | TokenType[];

    /** The text of the token */
    readonly text: UnicodeString;

    constructor(text: string | UnicodeString, types: TokenType | TokenType[]) {

        super();

        this.types = types;

        // Ensure tokens are canonically structred. from a unicode perspective.
        this.text = text instanceof UnicodeString ? text : new UnicodeString(text);

        // No token is allowed to be empty except the end token.
        if(this.text.getLength() === 0 && !this.is(TokenType.END)) 
            throw Error("This token has no text");

    }

    // NODE CONTRACT

    getGrammar() { return []; }
    isLeaf() { return true; }
    computeConflicts() {}
    
    
    

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: this.is(TokenType.NAME) ? "a name" : 
                this.is(TokenType.BINARY_OP) || this.is(TokenType.UNARY_OP) ? "an operator" :
                this.is(TokenType.DOCS) ? "documentation" :
                this.is(TokenType.JAPANESE) || this.is(TokenType.ROMAN) || this.is(TokenType.NUMBER) || this.is(TokenType.PI) || this.is(TokenType.INFINITY) ? "a number" :
                this.is(TokenType.SHARE) ? "share" :
                "a token"
        }
    }

    getFirstPlaceholder(): Node | undefined {
        return this.is(TokenType.PLACEHOLDER) ? this : undefined;
    }

    // TOKEN TYPES

    isnt(type: TokenType) { return !this.is(type); }
    is(type: TokenType) { return this.getTypes().includes(type); }
    isName() { return this.is(TokenType.NAME); }
    getTypes() { return Array.isArray(this.types) ? this.types : [ this.types ]; }

    // TEXT UTILITIES

    /** Get the grapheme length of the text (as opposed to the codepoint length) */
    getText() { return this.text.toString(); }
    getTextLength() { return this.text.getLength(); }
    getPreferredPrecedingSpace() { return ""; }
    toWordplay(spaces?: Spaces) { return `${spaces?.getSpace(this) ?? ""}${this.text.toString()}`; }

    // TRANSFORMATIONS

    replace(original?: Node, replacement?: Node): this {
        // Is this what we're replacing? Replace it.
        if(original === this && replacement instanceof Token) return replacement as this;
        // Otherwise, just return this, since it isn't changing.
        else return this;
    }

    equals(node: Node) {
        return node instanceof Token && this.getText() === node.getText();
    }

    // DEBUGGING

    toString(depth: number=0){ return `${"\t".repeat(depth)}${Array.isArray(this.types) ? this.types.map(t => TokenType[t]).join('/') : TokenType[this.types]}: ${this.text.toString().replaceAll("\n", "\\n").replaceAll("\t", "\\t")}`; }

}