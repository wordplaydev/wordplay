import type Conflict from '../conflicts/Conflict';
import Expression from './Expression';
import MeasurementType from './MeasurementType';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '../runtime/Evaluator';
import type Value from '../runtime/Value';
import Measurement from '../runtime/Measurement';
import type Step from '../runtime/Step';
import Finish from '../runtime/Finish';
import type Context from './Context';
import { NotAStream } from '../conflicts/NotAStream';
import StreamType from './StreamType';
import { NotAStreamIndex } from '../conflicts/NotAStreamIndex';
import Stream from '../runtime/Stream';
import KeepStream from '../runtime/KeepStream';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TypeException from '../runtime/TypeException';
import AnyType from './AnyType';
import TokenType from './TokenType';
import { PREVIOUS_SYMBOL } from '../parser/Symbols';
import Start from '../runtime/Start';
import UnionType from './UnionType';
import NoneType from './NoneType';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';
import { NotAStreamType } from './NotAStreamType';

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
            new Token(PREVIOUS_SYMBOL, TokenType.PREVIOUS),
            index
        );
    }

    getGrammar() {
        return [
            {
                name: 'stream',
                types: [Expression],
                label: (translation: Translation) => translation.data.stream,
                // Must be a stream
                getType: () => StreamType.make(new AnyType()),
            },
            { name: 'previous', types: [Token] },
            {
                name: 'index',
                types: [Expression],
                label: (translation: Translation) => translation.data.index,
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
        const streamType = this.stream.getType(context);

        if (!(streamType instanceof StreamType))
            return [new NotAStream(this, streamType)];

        const indexType = this.index.getType(context);
        if (
            !(indexType instanceof MeasurementType) ||
            indexType.unit !== undefined
        )
            return [new NotAStreamIndex(this, indexType)];

        return [];
    }

    computeType(context: Context): Type {
        // The type is the stream's type.
        const streamType = this.stream.getType(context);
        return streamType instanceof StreamType
            ? UnionType.make(streamType.type, NoneType.None)
            : new NotAStreamType(this, streamType);
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

        const index = evaluator.popValue(MeasurementType.make());
        if (!(index instanceof Measurement) || !index.num.isInteger())
            return index;

        const stream = evaluator.popValue(StreamType.make(new AnyType()));
        if (!(stream instanceof Stream))
            return new TypeException(
                evaluator,
                StreamType.make(new AnyType()),
                stream
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

    getDescription(translation: Translation) {
        return translation.expressions.Previous.description;
    }

    getStartExplanations(translation: Translation) {
        return translation.expressions.Previous.start;
    }

    getFinishExplanations(translation: Translation) {
        return translation.expressions.Previous.finish;
    }
}
