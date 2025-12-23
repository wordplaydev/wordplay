import type Conflict from '@conflicts/Conflict';
import { MisplacedConversion } from '@conflicts/MisplacedConversion';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import ConversionDefinitionValue from '@values/ConversionDefinitionValue';
import InternalException from '@values/InternalException';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import NodeRef from '../locale/NodeRef';
import Characters from '../lore/BasisCharacters';
import parseType from '../parser/parseType';
import { toTokens } from '../parser/toTokens';
import type Value from '../values/Value';
import Block from './Block';
import type Context from './Context';
import ConversionType from './ConversionType';
import DefinitionExpression from './DefinitionExpression';
import Docs from './Docs';
import Expression, { type GuardContext } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Node from './Node';
import { any, node, none, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import TypePlaceholder from './TypePlaceholder';
import type TypeSet from './TypeSet';

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

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleAppends() {
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

    getDescriptor(): NodeDescriptor {
        return 'ConversionDefinition';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'docs',
                kind: any(node(Docs), none()),
                label: () => (l) => l.term.documentation,
            },
            { name: 'arrow', kind: node(Sym.Convert), label: undefined },
            {
                name: 'input',
                kind: node(Type),
                space: true,
                label: (locales) => () => this.input.getLabel(locales),
            },
            {
                name: 'output',
                kind: node(Type),
                space: true,
                label: (locales) => () => this.output.getLabel(locales),
            },
            {
                name: 'expression',
                kind: node(Expression),
                space: true,
                indent: true,
                // Must match the output type
                getType: () => this.output,
                label: () => (l) =>
                    l.node.ConversionDefinition.label.expression,
            },
        ];
    }

    getPurpose() {
        return Purpose.Types;
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

    static readonly LocalePath = (l: LocaleText) => l.node.ConversionDefinition;
    getLocalePath() {
        return ConversionDefinition.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.ConversionDefinition.start);
    }

    getCharacter() {
        return Characters.Conversion;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [
            new NodeRef(this.input, locales, context),
            new NodeRef(this.output, locales, context),
        ];
    }
}
