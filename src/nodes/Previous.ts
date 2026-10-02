import conciseRef from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import getConceptName from '#locale/getConceptName.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { PREVIOUS_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import NumberValue from '#values/NumberValue.ts';
import StreamValue from '#values/StreamValue.ts';
import TypeException from '#values/TypeException.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import AnyType from '#nodes/AnyType.ts';
import type Context from '#nodes/Context.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import ListType from '#nodes/ListType.ts';
import { node, optional, type Grammar, type Replacement } from '#nodes/Node.ts';
import NoneType from '#nodes/NoneType.ts';
import NumberType from '#nodes/NumberType.ts';
import StreamType, { isStreamExpression } from '#nodes/StreamType.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import UnionType from '#nodes/UnionType.ts';
import Unit from '#nodes/Unit.ts';

export default class Previous extends Expression {
    readonly previous: Token;
    readonly range: Token | undefined;
    readonly number: Expression;
    readonly stream: Expression;

    constructor(
        previous: Token,
        range: Token | undefined,
        index: Expression,
        stream: Expression,
    ) {
        super();

        this.previous = previous;
        this.range = range;
        this.number = index;
        this.stream = stream;

        this.computeChildren();
    }

    static make(stream: Expression, index: Expression, range = false) {
        return new Previous(
            new Token(PREVIOUS_SYMBOL, Sym.Previous),
            range ? new Token(PREVIOUS_SYMBOL, Sym.Previous) : undefined,
            index,
            stream,
        );
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        // Offer `←1 stream` on any stream-valued expression. Only the `range` insertion below
        // existed, which could add the second `←` to a Previous but never make the first one.
        return node instanceof Expression && isStreamExpression(node, context)
            ? [Previous.make(node, NumberLiteral.make(1))]
            : [];
    }

    static getPossibleInsertions({ parent, field }: InsertContext) {
        return parent instanceof Previous && field === 'range'
            ? [new Token(PREVIOUS_SYMBOL, Sym.Previous)]
            : [];
    }

    getDescriptor(): NodeDescriptor {
        return 'Previous';
    }

    getGrammar(): Grammar {
        return [
            { name: 'previous', kind: node(Sym.Previous), label: undefined },
            {
                name: 'range',
                kind: optional(node(Sym.Previous)),
                label: (l) => (l) => l.node.Previous.label.range,
            },
            {
                name: 'number',
                kind: node(Expression),
                label: () => (l) => l.glossary.index.word,
                // Must be a number
                getType: () => NumberType.make(),
                space: true,
            },
            {
                name: 'stream',
                kind: node(Expression),
                label: () => (l) => getConceptName(l, 'stream'),
                // Must be a stream
                getType: () => StreamType.make(new AnyType()),
                space: true,
            },
        ];
    }

    getPurpose() {
        return Purpose.Inputs;
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Previous(
                this.replaceChild('previous', this.previous, replace),
                this.replaceChild('range', this.range, replace),
                this.replaceChild('number', this.number, replace),
                this.replaceChild('stream', this.stream, replace),
            ),
        );
    }

    computeConflicts(context: Context): Conflict[] {
        // Ask the expression, not its type; see streamProvenance.
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

        const indexType = this.number.getType(context);
        if (
            !context.isUnknownDownstream(this.number) &&
            !(
                indexType instanceof NumberType &&
                indexType.unit instanceof Unit &&
                indexType.unit.isUnitless()
            )
        )
            return [
                new IncompatibleInput(
                    this.number,
                    indexType,
                    NumberType.make(),
                ),
            ];

        return [];
    }

    computeType(context: Context): Type {
        // The type is the stream's value type. For a `•…T`-typed stream, unwrap to
        // the value type it dereferences to, so `← s` is `T | ø` and `←← n s` is `[T]`. (#1237)
        const valueType = this.stream.getType(context).withoutStream(context);
        return this.range == undefined
            ? UnionType.make(valueType, NoneType.None)
            : ListType.make(valueType);
    }

    getDependencies(): Expression[] {
        return [this.stream, this.number];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            ...this.stream.compile(evaluator, context),
            ...this.number.compile(evaluator, context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const number = evaluator.popValue(this, NumberType.make());
        if (!(number instanceof NumberValue) || !number.num.isInteger())
            return number;

        const num = number.toNumber();

        // Get the stream value.
        const value = evaluator.popValue(this);

        // Get the stream the value came from.
        const stream = evaluator.getStreamResolved(value);

        if (!(stream instanceof StreamValue))
            return new TypeException(
                this,
                evaluator,
                StreamType.make(new AnyType()),
                value,
            );

        return this.range === undefined
            ? stream.at(this, num)
            : stream.range(this, num);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.stream instanceof Expression)
            this.stream.evaluateTypeGuards(current, guard);
        if (this.number instanceof Expression)
            this.number.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.previous;
    }
    getFinish() {
        return this.previous;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Previous;
    getLocalePath() {
        return Previous.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.Previous.start, {
            stream: new NodeRef(this.stream, locales, context),
        });
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.Previous.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            stream: conciseRef(this.stream, locales, context),
            number: conciseRef(this.number, locales, context),
            range: this.range ? true : undefined,
        };
    }

    getCharacter() {
        return Characters.Previous;
    }
}
