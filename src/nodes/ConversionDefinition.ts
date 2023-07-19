import type Node from './Node';
import Expression from './Expression';
import Token from './Token';
import TokenType from './TokenType';
import type Conflict from '@conflicts/Conflict';
import { MisplacedConversion } from '@conflicts/MisplacedConversion';
import Block from './Block';
import ConversionType from './ConversionType';
import Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Conversion from '@runtime/Conversion';
import type Context from './Context';
import { parseType, toTokens } from '@parser/Parser';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import Docs from './Docs';
import StartFinish from '@runtime/StartFinish';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import AtomicExpression from './AtomicExpression';
import InternalException from '@runtime/InternalException';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import type Value from '../runtime/Value';
import NodeRef from '../locale/NodeRef';

export default class ConversionDefinition extends AtomicExpression {
    readonly docs: Docs | undefined;
    readonly arrow: Token;
    readonly input: Type;
    readonly output: Type;
    readonly expression: Expression;

    constructor(
        docs: Docs | undefined,
        arrow: Token,
        input: Type,
        output: Type,
        expression: Expression
    ) {
        super();

        this.docs = docs;
        this.arrow = arrow;
        this.input = input;
        this.output = output;
        this.expression = expression;

        this.computeChildren();
    }

    static make(
        docs: Docs | undefined,
        input: Type | string,
        output: Type | string,
        expression: Expression
    ) {
        return new ConversionDefinition(
            docs,
            new Token(CONVERT_SYMBOL, TokenType.Convert),
            input instanceof Type ? input : parseType(toTokens(input)),
            output instanceof Type ? output : parseType(toTokens(output)),
            expression
        );
    }

    getGrammar() {
        return [
            { name: 'docs', types: [Docs, undefined] },
            { name: 'arrow', types: [TokenType.Convert] },
            { name: 'input', types: [Type], space: true },
            { name: 'output', types: [Type], space: true },
            {
                name: 'expression',
                types: [Expression],
                space: true,
                indent: true,
                // Must match the output type
                getType: () => this.output,
            },
        ];
    }

    getPurpose() {
        return Purpose.Convert;
    }

    clone(replace?: Replacement) {
        return new ConversionDefinition(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('arrow', this.arrow, replace),
            this.replaceChild('input', this.input, replace),
            this.replaceChild('output', this.output, replace),
            this.replaceChild('expression', this.expression, replace)
        ) as this;
    }

    isEvaluationInvolved() {
        return true;
    }
    isEvaluationRoot() {
        return true;
    }

    isBlock(child: Node) {
        return child === this.expression;
    }

    convertsTypeTo(input: Type, output: Type, context: Context) {
        return (
            this.input.accepts(input, context) &&
            this.output.accepts(output, context)
        );
    }

    convertsType(input: Type, context: Context) {
        return this.input.accepts(input, context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // Can only appear in a block or nowhere, but not anywhere else
        if (!(this.getParent(context) instanceof Block))
            conflicts.push(new MisplacedConversion(this));

        return conflicts;
    }

    computeType(): Type {
        return ConversionType.make(this.input, this.output);
    }

    getDependencies(): Expression[] {
        return [this.expression];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator): Value {
        const context = evaluator.getCurrentEvaluation();
        if (context === undefined)
            return new InternalException(
                this,
                evaluator,
                'there is no evaluation, which should be impossible'
            );

        const value = new Conversion(this, context);

        context.addConversion(value);

        return value;
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.expression instanceof Expression)
            this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.arrow;
    }
    getFinish() {
        return this.arrow;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.ConversionDefinition;
    }

    getStartExplanations(translation: Locale) {
        return concretize(
            translation,
            translation.node.ConversionDefinition.start
        );
    }

    getGlyphs() {
        return Glyphs.Conversion;
    }

    getDescriptionInputs(locale: Locale, context: Context) {
        return [
            new NodeRef(this.input, locale, context),
            new NodeRef(this.output, locale, context),
        ];
    }
}
