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
import type Translation from '@translation/Translation';
import Literal from './Literal';

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
            new Token(`'${text ?? ''}'`, TokenType.TEXT),
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

    getNodeTranslation(translation: Translation) {
        return translation.nodes.TextLiteral;
    }

    getStartExplanations(translation: Translation) {
        return translation.nodes.TextLiteral.start;
    }
}
