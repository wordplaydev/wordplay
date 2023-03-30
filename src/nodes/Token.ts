import UnicodeString from '../models/UnicodeString';
import type Spaces from '@parser/Spaces';
import type Translation from '@translation/Translation';
import Node, { type Replacement } from './Node';
import TokenType from './TokenType';
import Emotion from '../lore/Emotion';
import Purpose from '../concepts/Purpose';
import type { Description } from '@translation/Translation';
import type Root from './Root';
import { REVERSE_TEXT_DELIMITERS, TEXT_DELIMITERS } from '../parser/Tokenizer';
import { Languages } from '../translation/LanguageCode';
import type Definition from './Definition';
import type Context from './Context';

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
        if (this.text.isEmpty() && !this.is(TokenType.End))
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

    getPurpose() {
        return Purpose.REPRESENT;
    }

    // TOKEN TYPES

    isnt(type: TokenType) {
        return !this.is(type);
    }
    is(type: TokenType) {
        return this.getTypes().includes(type);
    }
    isName() {
        return this.is(TokenType.Name);
    }
    getTypes() {
        return this.types;
    }

    isEqualTo(node: Node) {
        return (
            node instanceof Token &&
            this.getText() === node.getText() &&
            JSON.stringify(this.types) === JSON.stringify(node.types)
        );
    }

    toWordplay(spaces?: Spaces): string {
        return `${spaces?.getSpace(this) ?? ''}${this.text.toString()}`;
    }

    // TEXT UTILITIES

    /** Get the grapheme length of the text (as opposed to the codepoint length) */
    getText() {
        return this.text.toString();
    }

    getDelimiters() {
        return (
            (this.text.at(0)?.toString() ?? '') +
            (this.text.at(this.text.getLength() - 1)?.toString() ?? '')
        );
    }

    getTextLength() {
        return this.text.getLength();
    }

    startsWith(prefix: string) {
        return this.text.startsWith(prefix);
    }

    containsText(text: string) {
        return this.text.contains(text);
    }

    /** If this is a placeholder, determine a label for it. */
    getPlaceholder(
        root: Root,
        context: Context,
        translation: Translation
    ): Description | undefined {
        if (!this.is(TokenType.Placeholder)) return undefined;
        const parent = root.getParent(this);
        return parent === undefined
            ? undefined
            : parent.getChildPlaceholderLabel(this, translation, context);
    }

    localized(
        name: boolean,
        translations: Translation[],
        root: Root,
        context: Context
    ) {
        // Get this token's text
        let text = this.getText();

        // Is this text? Localize delimiters.
        const isText = this.is(TokenType.Text);
        const isTextOpen = this.is(TokenType.TemplateOpen);
        const isTextClose = this.is(TokenType.TemplateClose);
        if (isText || isTextOpen || isTextClose) {
            // Is there a closing delimiter? If not, we don't replace it.
            const lastChar = text.at(-1);
            const last =
                text.length > 1 &&
                lastChar !== undefined &&
                lastChar in REVERSE_TEXT_DELIMITERS;
            const preferredQuote = Languages[translations[0].language].quote;
            if (preferredQuote) {
                const preferredClosing = TEXT_DELIMITERS[preferredQuote];
                text = isText
                    ? preferredQuote +
                      text.substring(1, text.length - (last ? 1 : 0)) +
                      (last ? preferredClosing : '')
                    : isTextOpen
                    ? preferredQuote + text.substring(1)
                    : text.substring(0, text.length - (last ? 1 : 0)) +
                      (last ? preferredClosing : '');
            }
        }

        // Is this a name? Choose the most appropriate name.
        if (this.is(TokenType.Name) && name) {
            const parent = root.getParent(this);
            let def: Definition | undefined = undefined;
            if (parent) {
                def = parent.getCorrespondingDefinition(context);
                if (def) {
                    text =
                        def.names.getEmojiName() ??
                        def.names.getTranslation(
                            translations.map((t) => t.language)
                        );
                }
            }
        }

        // Return the localized text.
        return text;
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

    withText(text: string) {
        return new Token(text, this.types);
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

    getGlyphs() {
        return {
            symbols: this.getText(),
            emotion: Emotion.Cheerful,
        };
    }
}
