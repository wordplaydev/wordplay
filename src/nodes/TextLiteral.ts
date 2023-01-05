import type Expression from './Expression';
import TextType from './TextType';
import Token from './Token';
import type Type from './Type';
import type Value from '../runtime/Value';
import Text from '../runtime/Text';
import type Step from '../runtime/Step';
import Language from './Language';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import type Evaluator from '../runtime/Evaluator';
import StartFinish from '../runtime/StartFinish';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';
import AtomicExpression from './AtomicExpression';

export default class TextLiteral extends AtomicExpression {
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

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(_: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

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

    getDescription(translation: Translation) {
        return translation.expressions.TextLiteral.description;
    }

    getStartExplanations(translation: Translation) {
        return translation.expressions.TextLiteral.start;
    }
}
