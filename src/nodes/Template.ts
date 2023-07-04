import Expression from './Expression';
import TextType from './TextType';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import Text from '@runtime/Text';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import type Context from './Context';
import Language from './Language';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import Start from '@runtime/Start';
import TokenType from './TokenType';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';
import { TEMPLATE_SYMBOL } from '../parser/Symbols';

export type TemplatePart = Expression | Token;

export default class Template extends Expression {
    readonly open: Token;
    readonly expressions: TemplatePart[];
    readonly format?: Language;

    constructor(open: Token, expressions: TemplatePart[], format?: Language) {
        super();

        this.open = open;
        this.expressions = expressions ?? [
            new Token(`'${TEMPLATE_SYMBOL}`, TokenType.TemplateOpen),
            ExpressionPlaceholder.make(TextType.make()),
            new Token(`${TEMPLATE_SYMBOL}'`, TokenType.TemplateClose),
        ];
        this.format = format;

        this.computeChildren();
    }

    static make() {
        return new Template(new Token('"\\', TokenType.TemplateOpen), [
            new Token('\\"', TokenType.TemplateClose),
        ]);
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            {
                name: 'expressions',
                types: [[Expression, Token]],
                label: (translation: Locale) => translation.data.text,
            },
            { name: 'format', types: [Language, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new Template(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('expressions', this.expressions, replace),
            this.replaceChild('format', this.format, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'text';
    }

    computeConflicts() {
        return [];
    }

    computeType(): Type {
        return TextType.make(this.format);
    }

    getDependencies(): Expression[] {
        return [
            ...this.expressions.filter(
                (ex): ex is Expression => ex instanceof Expression
            ),
        ];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.expressions
                .filter((p) => p instanceof Expression)
                .reduce(
                    (parts: Step[], part) => [
                        ...parts,
                        ...(part as Expression).compile(context),
                    ],
                    []
                ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Build the string in reverse, accounting for the reversed stack of values.
        let text = '';
        for (let i = this.expressions.length - 1; i >= 0; i--) {
            const p = this.expressions[i];
            const part =
                // Is the token static text? Grab the text minus the delimiters.
                p instanceof Token
                    ? new Text(
                          this,
                          p.text
                              .toString()
                              .substring(1, p.text.toString().length - 1)
                      )
                    : // Otherwise, get the value off the top of the stack and convert it to string, unless it is already text.
                    // Or if it's already text, just keep it as is.
                    evaluator.peekValue() instanceof Text
                    ? (evaluator.popValue(this) as Text)
                    : new Text(this, evaluator.popValue(this).toString());
            text = part.text + text;
        }
        text =
            this.open.text
                .toString()
                .substring(1, this.open.text.toString().length - 1) + text;
        return new Text(this, text, this.format?.getLanguage());
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        this.expressions.forEach((part) => {
            if (part instanceof Expression)
                part.evaluateTypeSet(bind, original, current, context);
        });
        return current;
    }

    getStart() {
        return this.open;
    }

    getFinish() {
        return this.expressions[this.expressions.length - 1] ?? this.open;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Template;
    }

    getStartExplanations(translation: Locale) {
        return translation.node.Template.start;
    }

    getFinishExplanations(translation: Locale) {
        return translation.node.Template.finish;
    }

    getGlyphs() {
        return Glyphs.Template;
    }
}
