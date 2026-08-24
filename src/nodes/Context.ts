import type Project from '@db/projects/Project';
import CycleType from '@nodes/CycleType';
import type Definition from '@nodes/Definition';
import type Expression from '@nodes/Expression';
import type Input from '@nodes/Input';
import type Node from '@nodes/Node';
import type PropertyReference from '@nodes/PropertyReference';
import type Reference from '@nodes/Reference';
import type Source from '@nodes/Source';
import type Type from '@nodes/Type';
import UnknownType from '@nodes/UnknownType';

/** Passed around during type inference and conflict detection to facilitate program analysis and cycle-detection. */
export default class Context {
    readonly project: Project;
    readonly source: Source;

    readonly stack: Node[] = [];
    types: Map<Node, Type> = new Map();

    /**
     * This is a record of the guarded types of references and property references during evaluation,
     * used by Reference, PropertyReference, ListAccess, and SetOrMapAccess to remember
     * the narrowed types of their referenced bindings. We organize these by string keys representing
     * some expression on which the reference is guarded. For regular References or PropertyReferences,
     * there is only one key, but for List, Set, and Map references, there is a list index or key.
     */
    referenceUnions: Map<PropertyReference | Reference, Map<string, Type>> =
        new Map();

    definitions: Map<Node, Definition[]> = new Map();

    /** How many cycles this context's type inference has run into. Only ever
     * compared against itself, to tell whether one computation went through a
     * cycle; see {@link Context.getType}. */
    private cycles = 0;

    /**
     * Computed types that actually stem from streams. Used by expressions like Changed, Previous, and Reaction,
     * which rely on knowing the stream type from which a value type emerged.
     */

    constructor(project: Project, source: Source, adopt?: Context) {
        this.project = project;
        this.source = source;
        // Adopt the caches rather than copying them: they are keyed by node
        // identity, and the whole point is that the nodes did not change.
        if (adopt !== undefined) {
            this.types = adopt.types;
            this.referenceUnions = adopt.referenceUnions;
            this.definitions = adopt.definitions;
        }
    }

    /**
     * This context's memoized types against a newer project, for a source that
     * project did not change. Inferring a type walks every node it depends on,
     * so throwing this away on each edit means re-inferring an untouched source
     * on every keystroke — seconds of it, for a source with thousands of notes.
     *
     * `stack` is deliberately not adopted: it is the cycle-detection state of
     * one traversal, not a cache.
     */
    withProject(project: Project): Context {
        return new Context(project, this.source, this);
    }

    getRoot(node: Node) {
        return this.project.getRoot(node);
    }

    getBasis() {
        return this.project.basis;
    }

    /** Track cycles during conflict analysis. */
    visit(node: Node) {
        this.stack.push(node);
    }

    unvisit() {
        this.stack.pop();
    }

    visited(node: Node) {
        return this.stack.includes(node);
    }

    getType(node: Expression) {
        let cache = this.types.get(node);
        if (cache === undefined) {
            // If we visited the node already in this call to getType(), the type depends on itself.
            if (this.visited(node)) {
                this.cycles++;
                cache = new CycleType(
                    node,
                    this.stack.slice(this.stack.indexOf(node)),
                );
            } else {
                this.visit(node);
                // Note the cycle count before computing, so we can tell whether
                // this type was derived from one.
                const cyclesBefore = this.cycles;
                cache = node.computeType(this);
                // Memoize unless the computation went through a cycle. A cycle's
                // type depends on where the traversal entered it, so caching one
                // would let the entry point decide every later answer. Nothing
                // else is order-dependent, so everything else is safe to keep —
                // including the unknown types of a program being typed, which is
                // most programs most of the time. Refusing to cache those (the
                // rule this replaces) recomputed them on every ask: 5,460 of the
                // 8,807 type computations in one 280-line example, against one
                // actual cycle in the whole file.
                if (this.cycles === cyclesBefore) this.types.set(node, cache);
                this.unvisit();
            }
        }
        return cache;
    }

    getDefinitions(node: Node) {
        return this.definitions.get(node);
    }

    getReferenceType(
        ref: Reference | PropertyReference,
        key: string,
    ): Type | undefined {
        const keys = this.referenceUnions.get(ref);
        return keys ? keys.get(key) : undefined;
    }

    setReferenceType(
        ref: Reference | PropertyReference,
        key: string,
        type: Type,
    ) {
        const keys = this.referenceUnions.get(ref) ?? new Map<string, Type>();
        keys.set(key, type);
        return this.referenceUnions.set(ref, keys);
    }

    /**
     * Returns true when `expression`'s computed type is already an
     * {@link UnknownType}, meaning the root-cause conflict for it lives
     * elsewhere.
     *
     * Conflict producers should consult this before reporting type-
     * compatibility complaints against `expression` — otherwise the same root
     * cause gets re-reported by every consumer of the corrupt type, drowning
     * learners in cascading errors. See issue #1146: `a ? ??` would otherwise
     * yield UnknownName + UnparsableConflict + ExpectedBooleanCondition, where
     * the third is purely a consequence of the first.
     *
     * Accepts `Input` as well as `Expression` so callers iterating over table
     * cells / call arguments don't need to unwrap first; `Input.getType`
     * delegates to its underlying value's type.
     */
    isUnknownDownstream(expression: Expression | Input): boolean {
        return expression.getType(this) instanceof UnknownType;
    }
}
