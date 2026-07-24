import { Purpose } from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { STREAM_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '@basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import AnyType from '@nodes/AnyType';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';

export const STREAM_NATIVE_TYPE_NAME = 'stream';

export default class StreamType extends Type {
    readonly stream: Token;
    readonly type: Type;

    constructor(stream: Token, type: Type) {
        super();

        this.stream = stream;
        this.type = type;

        this.computeChildren();
    }

    static make(type?: Type) {
        return new StreamType(
            new Token(STREAM_SYMBOL, Sym.Stream),
            type ?? new AnyType(),
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'StreamType';
    }

    getPurpose() {
        return Purpose.Hidden;
    }

    getGrammar(): Grammar {
        return [
            { name: 'stream', kind: node(Sym.Stream), label: undefined },
            {
                name: 'type',
                kind: node(Type),
                label: () => (l) => l.glossary.type.word,
            },
        ];
    }

    computeConflicts() {
        return [];
    }

    /**
     * A stream slot accepts three things, in order. The key invariant is that the
     * `expression` argument distinguishes *static analysis* (which can prove stream
     * provenance) from the *runtime binding* path (which sees only the dereferenced
     * value): callers doing type-checking thread the argument expression through, so
     * a non-stream value is rejected; the runtime, which has already dereferenced the
     * stream to its latest value, passes no expression and accepts the value type.
     * (#1237)
     */
    acceptsAll(
        types: TypeSet,
        context: Context,
        expression?: Expression,
    ): boolean {
        // Another stream, with a compatible value type.
        if (
            types
                .list()
                .every(
                    (type) =>
                        type instanceof StreamType &&
                        this.type.accepts(type.type, context),
                )
        )
            return true;

        // Static call site (an expression is available): accept a value whose
        // *value* type is registered as stream-derived (e.g. `Time()`, or a
        // `•…T`-bound reference), so stream provenance carries into a function
        // parameter. `streamTypes` is keyed by value type, so a registration's
        // presence marks the value as stream-derived. Rejecting here is what keeps
        // a non-stream argument (`f(1ms)`) a conflict. (#1237)
        if (expression !== undefined) {
            const argValueType = expression.getType(context);
            return (
                context.getStreamType(argValueType) !== undefined &&
                this.type.accepts(argValueType, context)
            );
        }

        // No expression (runtime binding / provenance-free): a `•…T` holds the
        // dereferenced `T` value at runtime, so a stream slot accepts a plain `T`.
        // Provenance is tracked separately (Evaluator.streamsResolved). (#1237)
        return types.list().every((type) => this.type.accepts(type, context));
    }

    getStreamValueType(): Type {
        return this.type;
    }

    getBasisTypeName(): BasisTypeName {
        return 'stream';
    }

    concretize(context: Context) {
        return StreamType.make(this.type.concretize(context));
    }

    clone(replace?: Replacement) {
        return new StreamType(
            this.replaceChild('stream', this.stream, replace),
            this.replaceChild('type', this.type, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.StreamType;
    getLocalePath() {
        return StreamType.LocalePath;
    }

    getCharacter() {
        return Characters.Stream;
    }
}
