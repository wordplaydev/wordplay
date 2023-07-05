import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import MeasurementType from './MeasurementType';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import Measurement from '@runtime/Measurement';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import type Context from './Context';
import StreamType from './StreamType';
import Stream from '@runtime/Stream';
import KeepStream from '@runtime/KeepStream';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TypeException from '@runtime/TypeException';
import AnyType from './AnyType';
import TokenType from './TokenType';
import { PREVIOUS_SYMBOL } from '@parser/Symbols';
import Start from '@runtime/Start';
import UnionType from './UnionType';
import NoneType from './NoneType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeLink';
import Glyphs from '../lore/Glyphs';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import { NotAType } from './NotAType';

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
            new Token(PREVIOUS_SYMBOL, TokenType.Previous),
            index
        );
    }

    getGrammar() {
        return [
            {
                name: 'stream',
                types: [Expression],
                label: (translation: Locale) => translation.data.stream,
                // Must be a stream
                getType: () => StreamType.make(new AnyType()),
            },
            { name: 'previous', types: [Token] },
            {
                name: 'index',
                types: [Expression],
                label: (translation: Locale) => translation.data.index,
                // Must be a number
                getType: () => MeasurementType.make(),
            },
        ];
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
        if (
            !(indexType instanceof MeasurementType) ||
            indexType.unit !== undefined
        )
            return [
                new IncompatibleInput(
                    this.index,
                    indexType,
                    MeasurementType.make()
                ),
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
            new KeepStream(this),
            ...this.index.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const index = evaluator.popValue(this, MeasurementType.make());
        if (!(index instanceof Measurement) || !index.num.isInteger())
            return index;

        const value = evaluator.popValue(this, StreamType.make(new AnyType()));
        // Get the stream the value came from.
        const stream = evaluator.getStreamResolved(value);

        if (!(stream instanceof Stream))
            return new TypeException(
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

    getStartExplanations(translation: Locale, context: Context) {
        return translation.node.Previous.start(
            new NodeLink(this.stream, translation, context)
        );
    }

    getFinishExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.node.Previous.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Previous;
    }
}
