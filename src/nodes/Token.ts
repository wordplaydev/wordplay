import UnicodeString from "../models/UnicodeString";
import Node from "./Node";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export const TAB_WIDTH = 2;

export const SPACE_HTML = "&middot;";
export function tabToHTML() { return "&nbsp;".repeat(TAB_WIDTH - 1) + "→"; }

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

        // No token is allowed to be empty except the end token.
        if(this.text.getLength() === 0 && !this.is(TokenType.END)) 
            throw Error("This token has no text");

        // Split the whitespace by lines, then tabs.
        const lines = this.space?.split("\n");
        // Compute the number of newlines overall.
        this.newlines = lines === undefined ? 0 : lines.length - 1;
        // Compute the number of spaces on the last line.
        this.precedingSpaces = lines === undefined ? 0 : lines[lines.length - 1].split("").reduce((sum, s) => sum + (s === "\t" ? TAB_WIDTH : s === " " ? 1 : 0), 0);

    }

    getGrammar() { return []; }

    isLeaf() { return true; }
    /* Property accounts for unicode codepoints */
    getText() { return this.text.toString(); }
    hasNewline() { return this.newlines > 0; }
    hasPrecedingSpace() { return this.space.length > 0; }
    getPrecedingSpace(): string { return this.space; }

    /** Walk the ancestors, constructing preferred preceding space. */
    getPreferredPrecedingSpace(): string {
        let child: Node = this;
        let parent = this._parent;
        let preferredSpace = "";
        while(parent) {
            // If the current child's first token is still this, prepend some more space.
            if(child.getFirstLeaf() === this) {
                // See what space the parent would prefer based on the current space in place.
                preferredSpace = parent.getPreferredPrecedingSpace(child, this.space) + preferredSpace;
                child = parent;
                parent = parent.getParent();
            }
            // Otherwise, the child was the last parent that could influence space.
            else break;
        }
        return preferredSpace;
    }

    getAdditionalSpace(): string {

        const preferredSpace = this.getPreferredPrecedingSpace();

        if(preferredSpace.length === 0) return "";

        // Now that we have preferred space, reconcile it with the actual space.
        // 1) iterate through the explicit space
        // 2) each time we find a preferred space character (a space, a new line, a tab), consume it
        // 3) append whatever we didn't find to the end.
        let preferredSpaceChars = preferredSpace.split("");
        let additionalSpace = "";
        let index = 0;
        while(index < this.space.length) {
            let c = this.space.charAt(index);

            const lastLine = this.space.substring(index + 1).indexOf("\n") < 0;

            // If we expect a newline, space, or time, and we found one, remove it.
            if(c === preferredSpaceChars[0])
                preferredSpaceChars.shift();

            // If we expect a tab, and the current character is a space, read enough
            // spaces to account for a tab, and insert ones as needed.
            if(lastLine && preferredSpaceChars[0] === "\t" && c === " ") {
                let spacesRemaining = TAB_WIDTH;
                do {
                    spacesRemaining--;
                    index++;
                    c = this.space.charAt(index);
                } while(c === " " && spacesRemaining > 0);
                // Add any spaces remaining that we didn't find to make up for a tab.
                additionalSpace += " ".repeat(spacesRemaining);
                // Remove the tab.
                preferredSpaceChars.shift();
            }
            else
                index++;
        }
        // If we have any preferred space remaining, append it.
        additionalSpace += preferredSpaceChars.join("");
        return additionalSpace;

    }

    getTextLength() { return this.text.getLength(); }

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
    toWordplay() { return this.getPrecedingSpace() + this.text.toString(); }
    computeConflicts() {}
    clone(pretty: boolean, original?: Node, replacement?: Node): this {
        if(original === this && replacement instanceof Token) return replacement as this;
        else return new Token(this.text, this.types, `${this.space}${pretty ? this.getAdditionalSpace() : ""}`).label(this._label) as this; 
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
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
            return this.withSpace(space).label(this._label) as this;
        else return this.clone(false);

    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getFirstPlaceholder(): Node | undefined {
        return this.is(TokenType.PLACEHOLDER) ? this : undefined;
    }

}