import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import NumberType from './NumberType';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import Number from '@runtime/Number';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import type Context from './Context';
import StreamType from './StreamType';
import Stream from '@runtime/Stream';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TypeException from '@runtime/TypeException';
import AnyType from './AnyType';
import Symbol from './Symbol';
import { PREVIOUS_SYMBOL } from '@parser/Symbols';
import Start from '@runtime/Start';
import UnionType from './UnionType';
import NoneType from './NoneType';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import { NotAType } from './NotAType';
import concretize from '../locale/concretize';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Purpose from '../concepts/Purpose';

export default class Previous extends Expression {
    readonly stream: Expression;
    readonly previous: Token;
    readonly index: Expression;

    constructor(stream: Expression, previous: Token, index: Expression) {
        super();

        this.stream = stream;
        this.previous = previous;
        this.index = index;

        this.computeChildren();
    }

    static make(stream: Expression, index: Expression) {
        return new Previous(
            stream,
            new Token(PREVIOUS_SYMBOL, Symbol.Previous),
            index
        );
    }

    static getPossibleNodes() {
        return [
            Previous.make(
                ExpressionPlaceholder.make(StreamType.make()),
                ExpressionPlaceholder.make(NumberType.make())
            ),
        ];
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'stream',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.stream,
                // Must be a stream
                getType: () => StreamType.make(new AnyType()),
            },
            { name: 'previous', kind: node(Symbol.Previous) },
            {
                name: 'index',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.index,
                // Must be a number
                getType: () => NumberType.make(),
            },
        ];
    }

    getPurpose() {
        return Purpose.Input;
    }

    clone(replace?: Replacement) {
        return new Previous(
            this.replaceChild('stream', this.stream, replace),
            this.replaceChild('previous', this.previous, replace),
            this.replaceChild('index', this.index, replace)
        ) as this;
    }

    computeConflicts(context: Context): Conflict[] {
        const valueType = this.stream.getType(context);
        const streamType = context.getStreamType(valueType);

        if (streamType === undefined)
            return [new IncompatibleInput(this, valueType, StreamType.make())];

        const indexType = this.index.getType(context);
        if (!(indexType instanceof NumberType) || indexType.unit !== undefined)
            return [
                new IncompatibleInput(this.index, indexType, NumberType.make()),
            ];

        return [];
    }

    computeType(context: Context): Type {
        // The type is the stream's type.
        const streamType = this.stream.getType(context);
        return streamType instanceof StreamType
            ? UnionType.make(streamType.type, NoneType.None)
            : new NotAType(this, streamType, StreamType.make());
    }

    getDependencies(): Expression[] {
        return [this.stream, this.index];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.stream.compile(context),
            ...this.index.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const index = evaluator.popValue(this, NumberType.make());
        if (!(index instanceof Number) || !index.num.isInteger()) return index;

        // Get the stream value.
        const value = evaluator.popValue(this);

        // Get the stream the value came from.
        const stream = evaluator.getStreamResolved(value);

        if (!(stream instanceof Stream))
            return new TypeException(
                this,
                evaluator,
                StreamType.make(new AnyType()),
                value
            );

        return stream.at(this, index.toNumber());
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.stream instanceof Expression)
            this.stream.evaluateTypeSet(bind, original, current, context);
        if (this.index instanceof Expression)
            this.index.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.previous;
    }
    getFinish() {
        return this.previous;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Previous;
    }

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.Previous.start,
            new NodeRef(this.stream, locale, context)
        );
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.Previous.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Previous;
    }
}
