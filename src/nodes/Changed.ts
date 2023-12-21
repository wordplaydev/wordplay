import type Conflict from '@conflicts/Conflict';
import Expression, { type GuardContext } from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import type Context from './Context';
import StreamType from './StreamType';
import type TypeSet from './TypeSet';
import TypeException from '@values/TypeException';
import AnyType from './AnyType';
import Sym from './Sym';
import { CHANGE_SYMBOL } from '@parser/Symbols';
import Start from '@runtime/Start';
import BoolValue from '@values/BoolValue';
import { node, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import NodeRef from '@locale/NodeRef';
import BooleanType from './BooleanType';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import concretize from '../locale/concretize';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Locales from '../locale/Locales';

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

    getDescriptor() {
        return 'Changed';
    }

    getGrammar(): Grammar {
        return [
            { name: 'change', kind: node(Sym.Change) },
            {
                name: 'stream',
                kind: node(Expression),
                space: true,
                // Must be a stream with any type
                getType: () => StreamType.make(new AnyType()),
            },
        ];
    }

    static getPossibleNodes() {
        return [Changed.make(ExpressionPlaceholder.make())];
    }

    clone(replace?: Replacement) {
        return new Changed(
            this.replaceChild('change', this.change, replace),
            this.replaceChild('stream', this.stream, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Decide;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'stream';
    }

    computeConflicts(context: Context): Conflict[] {
        // This will be a value type
        const valueType = this.stream.getType(context);
        const streamType = context.getStreamType(valueType);

        if (streamType === undefined)
            return [new IncompatibleInput(this, valueType, StreamType.make())];

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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Changed);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.Changed.start),
            new NodeRef(this.stream, locales, context),
        );
    }

    getGlyphs() {
        return Glyphs.Change;
    }
}
