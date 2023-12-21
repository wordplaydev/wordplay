import type Node from './Node';
import Expression, { type GuardContext } from './Expression';
import Token from './Token';
import Sym from './Sym';
import type Conflict from '@conflicts/Conflict';
import { MisplacedConversion } from '@conflicts/MisplacedConversion';
import Block from './Block';
import ConversionType from './ConversionType';
import Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import ConversionDefinitionValue from '@values/ConversionDefinitionValue';
import type Context from './Context';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type TypeSet from './TypeSet';
import Docs from './Docs';
import StartFinish from '@runtime/StartFinish';
import { node, none, type Grammar, type Replacement, any } from './Node';
import InternalException from '@values/InternalException';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import type Value from '../values/Value';
import NodeRef from '../locale/NodeRef';
import TypePlaceholder from './TypePlaceholder';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import { toTokens } from '../parser/toTokens';
import parseType from '../parser/parseType';
import DefinitionExpression from './DefinitionExpression';
import type Locales from '../locale/Locales';

export default class ConversionDefinition extends DefinitionExpression {
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
        expression: Expression,
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
        expression: Expression,
    ) {
        return new ConversionDefinition(
            docs,
            new Token(CONVERT_SYMBOL, Sym.Convert),
            input instanceof Type ? input : parseType(toTokens(input)),
            output instanceof Type ? output : parseType(toTokens(output)),
            expression,
        );
    }

    static getPossibleNodes() {
        return [
            ConversionDefinition.make(
                undefined,
                TypePlaceholder.make(),
                TypePlaceholder.make(),
                ExpressionPlaceholder.make(),
            ),
        ];
    }

    /** Used by Evaluator to get the steps for the evaluation of this conversion. */
    getEvaluationSteps(evaluator: Evaluator, context: Context): Step[] {
        return this.expression.compile(evaluator, context);
    }

    getDescriptor() {
        return 'ConversionDefinition';
    }

    getGrammar(): Grammar {
        return [
            { name: 'docs', kind: any(node(Docs), none()) },
            { name: 'arrow', kind: node(Sym.Convert) },
            { name: 'input', kind: node(Type), space: true },
            { name: 'output', kind: node(Type), space: true },
            {
                name: 'expression',
                kind: node(Expression),
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
            this.replaceChild('expression', this.expression, replace),
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
                'there is no evaluation, which should be impossible',
            );

        const value = new ConversionDefinitionValue(this, context);

        context.addConversion(value);

        return value;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.expression instanceof Expression)
            this.expression.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.arrow;
    }
    getFinish() {
        return this.arrow;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ConversionDefinition);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.ConversionDefinition.start),
        );
    }

    getGlyphs() {
        return Glyphs.Conversion;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [
            new NodeRef(this.input, locales, context),
            new NodeRef(this.output, locales, context),
        ];
    }
}
