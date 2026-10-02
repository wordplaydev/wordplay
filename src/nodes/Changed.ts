import { contentRef } from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { CHANGE_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import BoolValue from '#values/BoolValue.ts';
import TypeException from '#values/TypeException.ts';
import type Value from '#values/Value.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import { Purpose } from '#concepts/Purpose.ts';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import AnyType from '#nodes/AnyType.ts';
import BooleanType from '#nodes/BooleanType.ts';
import type Context from '#nodes/Context.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';
import StreamType, { isStreamExpression } from '#nodes/StreamType.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class Changed extends SimpleExpression {
    readonly change: Token;
    readonly stream: Expression;

    constructor(change: Token, stream: Expression) {
        super();

        this.change = change;
        this.stream = stream;

        this.computeChildren();
    }

    static make(stream: Expression) {
        return new Changed(new Token(CHANGE_SYMBOL, Sym.Change), stream);
    }

    getDescriptor(): NodeDescriptor {
        return 'Changed';
    }

    getGrammar(): Grammar {
        return [
            { name: 'change', kind: node(Sym.Change), label: undefined },
            {
                name: 'stream',
                kind: node(Expression),
                space: true,
                // Must be a stream with any type
                getType: () => StreamType.make(new AnyType()),
                label: () => (l) => l.node.Changed.label.stream,
            },
        ];
    }

    static getPossibleReplacements({ type }: ReplaceContext) {
        // If a boolean is expected, suggest Changed.
        return type instanceof BooleanType
            ? [Changed.make(ExpressionPlaceholder.make(StreamType.make()))]
            : [];
    }

    static getPossibleInsertions({ type }: InsertContext) {
        // If a boolean is expected, suggest Changed.
        return type instanceof BooleanType
            ? [Changed.make(ExpressionPlaceholder.make(StreamType.make()))]
            : [];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Changed(
                this.replaceChild('change', this.change, replace),
                this.replaceChild('stream', this.stream, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Inputs;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'stream';
    }

    computeConflicts(context: Context): Conflict[] {
        // Ask the expression, not its type: a stream's type is its *value* type, and a
        // value type gets rebuilt by every transform that touches it (see
        // streamProvenance).
        if (
            !isStreamExpression(this.stream, context) &&
            !context.isUnknownDownstream(this.stream)
        )
            return [
                new IncompatibleInput(
                    this,
                    this.stream.getType(context),
                    StreamType.make(),
                ),
            ];

        return [];
    }

    computeType(): Type {
        // The type is a boolean.
        return BooleanType.make();
    }

    getDependencies(): Expression[] {
        return [this.stream];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            ...this.stream.compile(evaluator, context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const value = evaluator.popValue(this);

        // Get the stream the value came from.
        const stream = evaluator.getStreamResolved(value);

        // No stream source? Exception time.
        if (stream === undefined)
            return new TypeException(
                this,
                evaluator,
                StreamType.make(new AnyType()),
                value,
            );

        return new BoolValue(this, evaluator.didStreamCauseReaction(stream));
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.stream instanceof Expression)
            this.stream.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.stream;
    }
    getFinish() {
        return this.change;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Changed;
    getLocalePath() {
        return Changed.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.Changed.start, {
            stream: new NodeRef(this.stream, locales, context),
        });
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            stream: contentRef(this.stream, locales, context),
        };
    }

    getCharacter() {
        return Characters.Change;
    }
}
