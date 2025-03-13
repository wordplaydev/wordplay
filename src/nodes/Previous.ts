import type Conflict from '@conflicts/Conflict';
import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { PREVIOUS_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import NumberValue from '@values/NumberValue';
import StreamValue from '@values/StreamValue';
import TypeException from '@values/TypeException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import AnyType from './AnyType';
import type Context from './Context';
import Expression, { type GuardContext } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import ListType from './ListType';
import { node, optional, type Grammar, type Replacement } from './Node';
import NoneType from './NoneType';
import NumberType from './NumberType';
import StreamType from './StreamType';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import UnionType from './UnionType';
import Unit from './Unit';

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

    static getPossibleReplacements({ node, context }: EditContext) {
        return node instanceof Expression &&
            node.getType(context).accepts(StreamType.make(), context)
            ? [
                  Previous.make(
                      node,
                      ExpressionPlaceholder.make(NumberType.make()),
                  ),
              ]
            : [];
    }

    static getPossibleAppends() {
        return [
            Previous.make(
                ExpressionPlaceholder.make(StreamType.make()),
                ExpressionPlaceholder.make(NumberType.make()),
            ),
        ];
    }

    getDescriptor(): NodeDescriptor {
        return 'Previous';
    }

    getGrammar(): Grammar {
        return [
            { name: 'previous', kind: node(Sym.Previous) },
            { name: 'range', kind: optional(node(Sym.Previous)) },
            {
                name: 'number',
                kind: node(Expression),
                label: () => (l) => l.term.index,
                // Must be a number
                getType: () => NumberType.make(),
                space: true,
            },
            {
                name: 'stream',
                kind: node(Expression),
                label: () => (l) => l.term.stream,
                // Must be a stream
                getType: () => StreamType.make(new AnyType()),
                space: true,
            },
        ];
    }

    getPurpose() {
        return Purpose.Input;
    }

    clone(replace?: Replacement) {
        return new Previous(
            this.replaceChild('previous', this.previous, replace),
            this.replaceChild('range', this.range, replace),
            this.replaceChild('number', this.number, replace),
            this.replaceChild('stream', this.stream, replace),
        ) as this;
    }

    computeConflicts(context: Context): Conflict[] {
        const valueType = this.stream.getType(context);
        const streamType = context.getStreamType(valueType);

        if (streamType === undefined)
            return [new IncompatibleInput(this, valueType, StreamType.make())];

        const indexType = this.number.getType(context);
        if (
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
        // The type is the stream's type.
        const valueType = this.stream.getType(context);
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
        return locales.concretize(
            (l) => l.node.Previous.start,
            new NodeRef(this.stream, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Previous.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getCharacter() {
        return Characters.Previous;
    }
}
