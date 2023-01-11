import UnicodeString from '../models/UnicodeString';
import type Spaces from '../parser/Spaces';
import type Translation from '../translation/Translation';
import Node, { type Replacement } from './Node';
import TokenType from './TokenType';

export default class Token extends Node {
    /** The one or more types of token this might represent. This is narrowed during parsing to one.*/
    readonly types: TokenType[];

    /** The text of the token */
    readonly text: UnicodeString;

    constructor(text: string | UnicodeString, types: TokenType | TokenType[]) {
        super();

        this.types = Array.isArray(types) ? types : [types];

        // Ensure tokens are canonically structred. from a unicode perspective.
        this.text =
            text instanceof UnicodeString ? text : new UnicodeString(text);

        // No token is allowed to be empty except the end token.
        if (this.text.getLength() === 0 && !this.is(TokenType.END))
            throw Error('This token has no text');
    }

    // NODE CONTRACT

    getGrammar() {
        return [];
    }
    isLeaf() {
        return true;
    }
    computeConflicts() {}

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Token;
    }

    // TOKEN TYPES

    isnt(type: TokenType) {
        return !this.is(type);
    }
    is(type: TokenType) {
        return this.getTypes().includes(type);
    }
    isName() {
        return this.is(TokenType.NAME);
    }
    getTypes() {
        return this.types;
    }

    // TEXT UTILITIES

    /** Get the grapheme length of the text (as opposed to the codepoint length) */
    getText() {
        return this.text.toString();
    }
    getTextLength() {
        return this.text.getLength();
    }
    toWordplay(spaces?: Spaces): string {
        return `${spaces?.getSpace(this) ?? ''}${this.text.toString()}`;
    }

    withText(text: string) {
        return new Token(text, this.types);
    }

    // TRANSFORMATIONS

    clone(replace?: Replacement): this {
        if (replace === undefined)
            return new Token(this.text, this.types) as this;

        const { original, replacement } = replace;
        // Is this what we're replacing? Replace it.
        if (original === this && replacement instanceof Token)
            return replacement as this;
        // Otherwise, just return this, since it isn't changing.
        else return this;
    }

    equals(node: Node) {
        return (
            node instanceof Token &&
            this.getText() === node.getText() &&
            JSON.stringify(this.types) === JSON.stringify(node.types)
        );
    }

    // DEBUGGING

    toString(depth: number = 0) {
        return `${'\t'.repeat(depth)}${
            Array.isArray(this.types)
                ? this.types.join()
                : TokenType[this.types]
        }: ${this.text
            .toString()
            .replaceAll('\n', '\\n')
            .replaceAll('\t', '\\t')}`;
    }
}
