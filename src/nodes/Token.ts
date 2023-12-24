import UnicodeString from '../models/UnicodeString';
import type Spaces from '../parser/Spaces';
import type Locale from '../locale/Locale';
import Node, { type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Emotion from '../lore/Emotion';
import Purpose from '../concepts/Purpose';
import type { Template } from '../locale/Locale';
import type Root from './Root';
import { TextCloseByTextOpen } from '../parser/Tokenizer';
import {
    getLanguageQuoteOpen,
    getLanguageSecondaryQuote,
} from '../locale/LanguageCode';
import type Definition from './Definition';
import type Context from './Context';
import type { TemplateInput } from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class Token extends Node {
    /** The one or more types of token this might represent. This is narrowed during parsing to one.*/
    readonly types: Sym[];

    /** The text of the token */
    readonly text: UnicodeString;

    constructor(text: string | UnicodeString, types: Sym | Sym[]) {
        super();

        this.types = Array.isArray(types) ? types : [types];

        // Ensure tokens are canonically structured from a unicode perspective.
        this.text =
            text instanceof UnicodeString ? text : new UnicodeString(text);

        // No token is allowed to be empty except the end token.
        // if (
        //     this.text.isEmpty() &&
        //     !this.isSymbol(Sym.End) &&
        //     !this.isSymbol(Sym.Words)
        // )
        //     throw Error('This token has no text');
    }

    // NODE CONTRACT

    getDescriptor() {
        return 'Token';
    }

    getGrammar(): Grammar {
        return [];
    }

    isLeaf() {
        return true;
    }

    computeConflicts() {
        return;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Token);
    }

    getPurpose() {
        return Purpose.Value;
    }

    // TOKEN TYPES

    isntSymbol(type: Sym) {
        return !this.isSymbol(type);
    }

    isSymbol(type: Sym) {
        return this.getTypes().includes(type);
    }

    isName() {
        return this.isSymbol(Sym.Name);
    }

    getTypes() {
        return this.types;
    }

    isEqualTo(node: Node) {
        return (
            node instanceof Token &&
            this.getText() === node.getText() &&
            this.types.some((type1) =>
                node.types.some((type2) => type1 === type2),
            )
        );
    }

    toWordplay(spaces?: Spaces): string {
        return `${spaces?.getSpace(this) ?? ''}${this.text.toString()}`;
    }

    // TEXT UTILITIES
    getText() {
        return this.text.toString();
    }

    toText() {
        return this.text.toString();
    }

    getDelimiters() {
        return (
            (this.text.at(0)?.toString() ?? '') +
            (this.text.at(this.text.getLength() - 1)?.toString() ?? '')
        );
    }

    /** Get the grapheme length of the text (as opposed to the codepoint length) */
    getTextLength() {
        return this.text.getLength();
    }

    startsWith(prefix: string) {
        return this.text.startsWith(prefix);
    }

    containsText(text: string) {
        return this.text.contains(text);
    }

    /**
     * Override node's
     * */
    getLabel(locales: Locales): string {
        return getTokenLabel(this, locales);
    }

    /** If this is a placeholder, determine a label for it. */
    getPlaceholder(
        root: Root,
        context: Context,
        locales: Locales,
    ): Template | undefined {
        if (!this.isSymbol(Sym.Placeholder)) return undefined;
        const parent = root.getParent(this);
        return parent === undefined
            ? undefined
            : parent.getChildPlaceholderLabel(this, locales, context, root);
    }

    getDescriptionInputs(locales: Locales): TemplateInput[] {
        return [getTokenLabel(this, locales), this.getText()];
    }

    localized(locales: Locale[], root: Root, context: Context) {
        // Get this token's text
        let text = this.getText();

        // Is this text? Localize delimiters.
        const isText = this.isSymbol(Sym.Text);
        if (isText) {
            // Find the parent.
            const parent = root.getParent(this);
            if (parent) {
                const leaves = parent.leaves();

                const open =
                    leaves[0] instanceof Token && leaves[0].isSymbol(Sym.Text)
                        ? leaves[0]
                        : undefined;
                const close =
                    leaves.at(-1) instanceof Token &&
                    leaves.at(-1)?.isSymbol(Sym.Text)
                        ? leaves.at(-1)
                        : undefined;
                if (open) {
                    const preferredQuote = getLanguageQuoteOpen(
                        locales[0].language,
                    );
                    const preferredSecondaryQuote = getLanguageSecondaryQuote(
                        locales[0].language,
                    );
                    const preferredOpen =
                        open.getText() === preferredQuote
                            ? preferredQuote
                            : open.getText() === preferredSecondaryQuote
                              ? preferredSecondaryQuote
                              : preferredQuote;
                    // Is this the open and its not the preferred quote? Make it the preferred one.
                    if (open === this) text = preferredOpen;
                    // Is this the close and the close isn't the preferred?
                    if (close === this)
                        text = TextCloseByTextOpen[preferredOpen];
                }
            }
        }

        // Is this a name? Choose the most appropriate name.
        if (this.isSymbol(Sym.Name)) {
            const parent = root.getParent(this);
            let def: Definition | undefined = undefined;
            if (parent) {
                def = parent.getCorrespondingDefinition(context);
                if (def) {
                    text =
                        def.names.getSymbolicName() ??
                        def.names.getPreferredNameString(locales);
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

    toString(depth = 0) {
        return `${'\t'.repeat(depth)}${
            Array.isArray(this.types) ? this.types.join() : Sym[this.types]
        }: ${this.text
            .toString()
            .replaceAll('\n', '\\n')
            .replaceAll('\t', '\\t')}`;
    }

    getGlyphs() {
        return {
            symbols: this.getText(),
            emotion: Emotion.cheerful,
        };
    }
}

export function getTokenLabel(token: Node, locales: Locales): string {
    if (!(token instanceof Token)) return token.getLabel(locales);

    const tokenType = Object.entries(Sym).find(
        ([, val]) => val === token.types[0],
    );
    const tokenLabel = tokenType
        ? locales.getLocale().token[tokenType[0] as keyof typeof Sym]
        : '';
    return tokenLabel;
}
