import TextType from './TextType';
import Token from './Token';
import type Type from './Type';
import Text from '@runtime/Text';
import Language from './Language';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Literal from './Literal';
import Emotion from '../lore/Emotion';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';

export default class TextLiteral extends Literal {
    readonly text: Token;
    readonly format?: Language;

    constructor(text: Token, format?: Language) {
        super();
        this.text = text;
        this.format = format;

        this.computeChildren();
    }

    static make(text?: string, format?: Language) {
        return new TextLiteral(
            new Token(`'${text ?? ''}'`, TokenType.Text),
            format
        );
    }

    getGrammar() {
        return [
            { name: 'text', types: [Token] },
            { name: 'format', types: [Language, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new TextLiteral(
            this.replaceChild('text', this.text, replace),
            this.replaceChild('format', this.format, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName {
        return 'text';
    }

    computeConflicts() {}

    computeType(): Type {
        return new TextType(this.text, this.format);
    }

    getValue() {
        // Remove the opening and optional closing quote symbols.
        const lastChar =
            this.text.text.toString().length === 0
                ? undefined
                : this.text.text
                      .toString()
                      .charAt(this.text.text.toString().length - 1);
        const lastCharIsQuote =
            lastChar === undefined
                ? false
                : ['』', '」', '»', '›', "'", '’', '”', '"'].includes(lastChar);
        return new Text(
            this,
            this.text.text
                .toString()
                .substring(
                    1,
                    this.text.text.toString().length - (lastCharIsQuote ? 1 : 0)
                ),
            this.format === undefined ? undefined : this.format.getLanguage()
        );
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
        return current;
    }

    getStart() {
        return this.text;
    }

    getFinish() {
        return this.text;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.TextLiteral;
    }

    getStartExplanations(translation: Locale) {
        return translation.node.TextLiteral.start;
    }

    getGlyphs() {
        return {
            symbols: this.text.getDelimiters(),
            emotion: Emotion.Excited,
        };
    }
}
