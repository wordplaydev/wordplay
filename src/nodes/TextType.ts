import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { TEXT_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import Emotion from '../lore/Emotion';
import BasisType from './BasisType';
import type Context from './Context';
import Language from './Language';
import { node, optional, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import TextLiteral from './TextLiteral';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import UnionType from './UnionType';

/** Any string or a specific string, depending on whether the given token is an empty text literal. */
export default class TextType extends BasisType {
    readonly open: Token;
    readonly text: Token | undefined;
    readonly close: Token | undefined;
    readonly language: Language | undefined;

    constructor(
        open: Token,
        text: Token | undefined,
        close: Token | undefined,
        language?: Language,
    ) {
        super();

        this.open = open;
        this.text = text;
        this.close = close;
        this.language = language;

        this.computeChildren();
    }

    static make(text?: string, format?: Language) {
        return new TextType(
            new Token(TEXT_SYMBOL, Sym.Text),
            text ? new Token(text, Sym.Words) : undefined,
            new Token(TEXT_SYMBOL, Sym.Text),
            format,
        );
    }

    static getPossibleReplacements() {
        return [TextType.make()];
    }

    static getPossibleInsertions() {
        return [TextType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'TextType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Text), label: undefined },
            { name: 'text', kind: optional(node(Sym.Words)), label: undefined },
            { name: 'close', kind: node(Sym.Text), label: undefined },
            {
                name: 'language',
                kind: optional(node(Language)),
                label: () => (l) => l.term.language,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new TextType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('text', this.text, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('language', this.language, replace),
        ) as this;
    }

    computeConflicts() {
        return [];
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        // For this to accept the given type, it must accept all possible types.
        return types.list().every((type) => {
            // If the type is a union, get its type set and see if this accepts all of them.
            if (type instanceof UnionType)
                return this.acceptsAll(type.getTypeSet(context), context);
            // If the possible type is not text, the type set is not acceptable.
            else if (!(type instanceof TextType)) return false;
            // If:
            // 1) this accepts any text, or its accepts specific text that matches the given type's text.
            // 2) this has no required format, or they have matching formats
            else
                return (
                    (this.text === undefined ||
                        (type.text !== undefined &&
                            this.text.getText() === type.text.getText())) &&
                    (this.language === undefined ||
                        (type.language !== undefined &&
                            this.language.isEqualTo(type.language)))
                );
        });
    }

    generalize(): Type {
        return TextType.make(undefined, this.language);
    }

    isLiteral() {
        return this.text !== undefined;
    }

    getLiteral() {
        return TextLiteral.make(this.text?.getText());
    }

    getBasisTypeName(): BasisTypeName {
        return 'text';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TextType;
    getLocalePath() {
        return TextType.LocalePath;
    }

    getCharacter() {
        return { symbols: this.open.getDelimiters(), emotion: Emotion.excited };
    }
    getDescriptionInputs() {
        return [this.isLiteral() ? this.open.getText() : undefined];
    }

    getDefaultExpression() {
        return TextLiteral.make(this.text ? this.text.getText() : '');
    }
}
