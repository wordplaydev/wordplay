import { Purpose } from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { STREAM_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '@basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import AnyType from '@nodes/AnyType';
import type Context from '@nodes/Context';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import DocumentedExpression from '@nodes/DocumentedExpression';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import StreamDefinition from '@nodes/StreamDefinition';
import Expression from '@nodes/Expression';
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

        // Static call site (an expression is available): accept an argument that names
        // a stream (`Time()`, or a `•…T`-bound reference), so stream provenance carries
        // into a function parameter. Rejecting here is what keeps a non-stream argument
        // (`f(1ms)`) a conflict. (#1237)
        if (expression !== undefined) {
            const argValueType = expression.getType(context);
            return (
                isStreamExpression(expression, context) &&
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

/**
 * Whether an expression names a stream — what `∆`, `←`, and a reaction's condition need
 * to know, and what a `•…T` slot accepts.
 *
 * This asks the *expression*, not its type, and that is the whole point. Stream-ness used
 * to be recorded in a map keyed by type-node identity, but type nodes get rebuilt
 * constantly — by concretize, by generalize, by union folding, by cloning — and each
 * rebuild produced a node the map had never heard of. Three separate patches existed only
 * to re-register a stream onto whatever fresh node some transform had just produced, and
 * every one of them was a bug report first (#1232, #1237, and narrowing a stream's value
 * type, which silently pulled its stream-ness out from under the `∆` testing it).
 * Expressions don't get rebuilt that way, so asking them is stable by construction.
 *
 * Bounded, since binds may name each other — a conflict, not a parse error, so this still
 * has to terminate.
 */
export function isStreamExpression(
    expression: Expression,
    context: Context,
    depth = 0,
): boolean {
    if (depth >= 16) return false;

    // An explicit `•…T` says so outright, wherever it's written.
    if (
        expression instanceof ExpressionPlaceholder &&
        expression.type?.getStreamValueType(context) !== undefined
    )
        return true;

    // Evaluating a stream definition — `Time()`, `Key()` — makes a stream.
    if (expression instanceof Evaluate)
        return expression.getFunction(context) instanceof StreamDefinition;

    // A name is a stream when what it names is.
    if (
        expression instanceof Reference ||
        expression instanceof PropertyReference
    ) {
        const definition = expression.resolve(context);
        if (definition instanceof StreamDefinition) return true;
        return definition instanceof Bind
            ? isStreamBind(definition, context, depth)
            : false;
    }

    // Parentheses and docs don't change what an expression is.
    if (expression instanceof Block) {
        const last = expression.getLast();
        return last instanceof Expression
            ? isStreamExpression(last, context, depth + 1)
            : false;
    }
    if (expression instanceof DocumentedExpression)
        return isStreamExpression(expression.expression, context, depth + 1);

    // Anything else is a stream only if it is typed as one.
    return (
        expression.getType(context).getStreamValueType(context) !== undefined
    );
}

/**
 * Whether a name holds a stream. An annotation of `•…T` declares one no matter what the
 * value is — that's how a stream passes into a function. Otherwise the value decides, but
 * only for a statement bind: an input's value is a default a caller may override, so it
 * says nothing about what the name will actually hold.
 */
export function isStreamBind(bind: Bind, context: Context, depth = 0): boolean {
    if (depth >= 16) return false;
    if (bind.type?.getStreamValueType(context) !== undefined) return true;
    return bind.value !== undefined && bind.getParent(context) instanceof Block
        ? isStreamExpression(bind.value, context, depth + 1)
        : false;
}
