import type Conflict from '#conflicts/Conflict.ts';
import { MisplacedConversion } from '#conflicts/MisplacedConversion.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { CONVERT_SYMBOL, SHARE_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import StartFinish from '#runtime/StartFinish.ts';
import type Step from '#runtime/Step.ts';
import ConversionDefinitionValue from '#values/ConversionDefinitionValue.ts';
import InternalException from '#values/InternalException.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import Characters from '../lore/BasisCharacters';
import parseType from '#parser/parseType.ts';
import { toTokens } from '#parser/toTokens.ts';
import type Value from '#values/Value.ts';
import Block from '#nodes/Block.ts';
import type Context from '#nodes/Context.ts';
import ConversionType from '#nodes/ConversionType.ts';
import DefinitionExpression from '#nodes/DefinitionExpression.ts';
import Docs from '#nodes/Docs.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import type Node from '#nodes/Node.ts';
import {
    any,
    node,
    none,
    optional,
    type Grammar,
    type Replacement,
} from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import { getPublishedShareConflicts } from '#nodes/publishedShare.ts';

export default class ConversionDefinition extends DefinitionExpression {
    readonly docs: Docs;
    /** `↑`, marking this conversion as part of a kit's public surface (#8). */
    readonly share: Token | undefined;
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
        share?: Token,
    ) {
        super();

        this.docs = docs ?? Docs.make();
        this.share = share;
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

    /** Whether this conversion is offered to projects that borrow the kit defining it. */
    isShared() {
        return this.share !== undefined;
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
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
                label: () => (l) => l.glossary.documentation.word,
            },
            {
                name: 'share',
                kind: optional(node(Sym.Share)),
                getToken: () => new Token(SHARE_SYMBOL, Sym.Share),
                label: undefined,
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
        return this.cloned(
            new ConversionDefinition(
                this.replaceChild('docs', this.docs, replace),
                this.replaceChild('arrow', this.arrow, replace),
                this.replaceChild('input', this.input, replace),
                this.replaceChild('output', this.output, replace),
                this.replaceChild('expression', this.expression, replace),
                this.replaceChild('share', this.share, replace),
            ),
        );
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

        // What a `↑` owes its readers, once this source is published (#8).
        conflicts.push(...getPublishedShareConflicts(this, context));

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
        return {
            input: new NodeRef(this.input, locales, context),
            output: new NodeRef(this.output, locales, context),
        };
    }
}
