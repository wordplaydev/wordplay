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
import Symbol from './Symbol';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import { node, type Grammar, type Replacement, list, optional } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';
import { TEMPLATE_SYMBOL } from '../parser/Symbols';
import { undelimited, unescaped } from './TextLiteral';
import concretize from '../locale/concretize';

export type TemplatePart = Expression | Token;

export default class Template extends Expression {
    readonly open: Token;
    readonly expressions: TemplatePart[];
    readonly language?: Language;

    constructor(open: Token, expressions: TemplatePart[], language?: Language) {
        super();

        this.open = open;
        this.expressions = expressions ?? [
            new Token(`'${TEMPLATE_SYMBOL}`, Symbol.TemplateOpen),
            ExpressionPlaceholder.make(TextType.make()),
            new Token(`${TEMPLATE_SYMBOL}'`, Symbol.TemplateClose),
        ];
        this.language = language;

        this.computeChildren();
    }

    static make() {
        return new Template(new Token('"\\', Symbol.TemplateOpen), [
            new Token('\\"', Symbol.TemplateClose),
        ]);
    }

    static getPossibleNodes() {
        return [Template.make()];
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.TemplateOpen) },
            {
                name: 'expressions',
                kind: list(node(Expression), node(Symbol.Text)),
                label: (translation: Locale) => translation.term.text,
                getType: () => TextType.make(),
            },
            { name: 'language', kind: optional(node(Language)) },
        ];
    }

    clone(replace?: Replacement) {
        return new Template(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('expressions', this.expressions, replace),
            this.replaceChild('language', this.language, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'text';
    }

    computeConflicts() {
        return [];
    }

    computeType(): Type {
        return TextType.make(this.language);
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
            let next: string;
            if (p instanceof Token) {
                next = undelimited(unescaped(p.getText()));
            } else if (evaluator.peekValue() instanceof Text) {
                next = (evaluator.popValue(this) as Text).text;
            } else {
                next = evaluator.popValue(this).toString();
            }
            // Assemble in reverse order
            text = next + text;
        }
        //
        text =
            this.open.text
                .toString()
                .substring(1, this.open.text.toString().length - 1) + text;
        return new Text(this, text, this.language?.getLanguage());
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

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.Template.start);
    }

    getFinishExplanations(locale: Locale) {
        return concretize(locale, locale.node.Template.finish);
    }

    getGlyphs() {
        return Glyphs.Template;
    }
}
