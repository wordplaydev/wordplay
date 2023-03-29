import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import type Context from './Context';
import { NotAStream } from '@conflicts/NotAStream';
import StreamType from './StreamType';
import KeepStream from '@runtime/KeepStream';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TypeException from '@runtime/TypeException';
import AnyType from './AnyType';
import TokenType from './TokenType';
import { CHANGE_SYMBOL } from '@parser/Symbols';
import Start from '@runtime/Start';
import Bool from '@runtime/Bool';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import AtomicExpression from './AtomicExpression';
import NodeLink from '@translation/NodeLink';
import BooleanType from './BooleanType';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';

export default class Changed extends AtomicExpression {
    readonly change: Token;
    readonly stream: Expression;

    constructor(change: Token, stream: Expression) {
        super();

        this.change = change;
        this.stream = stream;

        this.computeChildren();
    }

    static make(stream: Expression) {
        return new Changed(new Token(CHANGE_SYMBOL, TokenType.Change), stream);
    }

    getGrammar() {
        return [
            { name: 'change', types: [Token] },
            {
                name: 'stream',
                types: [Expression],
                space: true,
                // Must be a stream with any type
                getType: () => StreamType.make(new AnyType()),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Changed(
            this.replaceChild('change', this.change, replace),
            this.replaceChild('stream', this.stream, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.DECIDE;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'stream';
    }

    computeConflicts(context: Context): Conflict[] {
        // This will be a value type
        const valueType = this.stream.getType(context);
        const streamType = context.getStreamType(valueType);

        if (streamType === undefined) return [new NotAStream(this, valueType)];

        return [];
    }

    computeType(): Type {
        // The type is a boolean.
        return BooleanType.make();
    }

    getDependencies(): Expression[] {
        return [this.stream];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.stream.compile(context),
            new KeepStream(this),
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
                evaluator,
                StreamType.make(new AnyType()),
                value
            );

        return new Bool(this, evaluator.didStreamCauseReaction(stream));
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.stream instanceof Expression)
            this.stream.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.stream;
    }
    getFinish() {
        return this.change;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Changed;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.nodes.Changed.start(
            new NodeLink(this.stream, translation, context)
        );
    }

    getGlyphs() {
        return Glyphs.Change;
    }
}
