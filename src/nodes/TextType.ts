import type { NativeTypeName } from '../native/NativeConstants';
import { TEXT_SYMBOL } from '@parser/Symbols';
import type Translation from '@translation/Translation';
import Language from './Language';
import NativeType from './NativeType';
import type { Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
import type TypeSet from './TypeSet';
import Emotion from '../lore/Emotion';

/** Any string or a specific string, depending on whether the given token is an empty text literal. */
export default class TextType extends NativeType {
    readonly text: Token;
    readonly format?: Language;

    constructor(text: Token, format?: Language) {
        super();

        this.text = text;
        this.format = format;

        this.computeChildren();
    }

    static make(format?: Language) {
        return new TextType(new Token(TEXT_SYMBOL, TokenType.TEXT), format);
    }

    getGrammar() {
        return [
            { name: 'text', types: [Token] },
            { name: 'format', types: [Language, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new TextType(
            this.replaceChild('text', this.text, replace),
            this.replaceChild('format', this.format, replace)
        ) as this;
    }

    computeConflicts() {}

    acceptsAll(types: TypeSet): boolean {
        // For this to accept the given type, it must accept all possible types.
        return types.list().every((type) => {
            // If the possible type is not text, it is not acceptable.
            if (!(type instanceof TextType)) return false;
            // If:
            // 1) this accepts any text, or its accepts specific text that matches the given type's text.
            // 2) this has no required format, or they have matching formats
            return (
                (this.getUnquotedText() === '' ||
                    this.getUnquotedText() === type.getUnquotedText()) &&
                (this.format === undefined ||
                    (type.format !== undefined &&
                        this.format.equals(type.format)))
            );
        });
    }

    /** Strip the delimiters from the token to get the text literal that defines this type. */
    getUnquotedText() {
        const text = this.text.getText();
        return text.substring(1, text.length - 1);
    }

    getNativeTypeName(): NativeTypeName {
        return 'text';
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.TextType;
    }

    getGlyphs() {
        return {
            symbols: this.text.getDelimiters(),
            emotion: Emotion.Excited,
        };
    }
}
