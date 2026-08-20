import type Conflict from '@conflicts/Conflict';
import type Bind from '@nodes/Bind';
import type Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Node from '@nodes/Node';
import type StreamDefinition from '@nodes/StreamDefinition';
import StructureDefinition from '@nodes/StructureDefinition';

/** Anything an `Evaluate` can call. */
export type Callable =
    FunctionDefinition | StructureDefinition | StreamDefinition;

/**
 * Which `Evaluate`s call which definitions.
 *
 * This is the base layer of a project's analysis: it is derived from types
 * alone, so nothing it needs can depend on it. Everything else — the dependency
 * graph, and the conflicts that consult either — is built on top, in that order.
 */
export class CallGraph {
    private readonly calls: Map<Callable, Set<Evaluate>>;

    /** A reverse index from input bind to the calls that bind it, built on
     * first use. Without it, asking for one bind's callers scans every
     * definition in the project, and the reaction conflict check asks per
     * bind it walks past. */
    private bindCallers: Map<Bind, Evaluate[]> | undefined = undefined;

    constructor(calls: Map<Callable, Set<Evaluate>> = new Map()) {
        this.calls = calls;
    }

    add(fun: Callable, evaluate: Evaluate) {
        const set = this.calls.get(fun);
        if (set) set.add(evaluate);
        else this.calls.set(fun, new Set([evaluate]));
        this.bindCallers = undefined;
    }

    /** Fold another graph's calls into this one. Definitions are shared across
     * sources — a basis function is called from all of them — so these union. */
    merge(other: CallGraph) {
        for (const [fun, evaluates] of other.calls)
            for (const evaluate of evaluates) this.add(fun, evaluate);
    }

    getEvaluationsOf(fun: Callable): Evaluate[] {
        return Array.from(this.calls.get(fun) ?? []);
    }

    /**
     * The calls that decide what value `bind` takes, if it is an input of a
     * function or structure. A bind in a definition has no value of its own
     * until someone calls the definition, so its callers are its dependencies.
     *
     * Stream definitions are deliberately excluded, matching what `Bind` itself
     * used to report: a stream's inputs are bound once when the stream is
     * created, not per evaluation.
     */
    getCallersOfBind(bind: Bind): Evaluate[] {
        if (this.bindCallers === undefined) {
            this.bindCallers = new Map();
            for (const [fun, evaluates] of this.calls)
                if (
                    fun instanceof FunctionDefinition ||
                    fun instanceof StructureDefinition
                )
                    for (const input of fun.inputs)
                        this.bindCallers.set(input, [
                            ...(this.bindCallers.get(input) ?? []),
                            ...evaluates,
                        ]);
        }
        return this.bindCallers.get(bind) ?? [];
    }

    entries(): [Callable, Set<Evaluate>][] {
        return Array.from(this.calls.entries());
    }
}

/**
 * Which expressions are affected when another expression's value changes,
 * mapping each expression to its dependents. Built from every expression's
 * `getDependencies`, plus the caller edges the call graph implies.
 */
export class DependencyGraph {
    private readonly dependents: Map<Expression, Set<Expression>>;

    constructor(dependents: Map<Expression, Set<Expression>> = new Map()) {
        this.dependents = dependents;
    }

    add(dependency: Expression, dependent: Expression) {
        const set = this.dependents.get(dependency);
        if (set) set.add(dependent);
        else this.dependents.set(dependency, new Set([dependent]));
    }

    merge(other: DependencyGraph) {
        for (const [dependency, dependents] of other.dependents)
            for (const dependent of dependents) this.add(dependency, dependent);
    }

    getExpressionsAffectedBy(expression: Expression): Set<Expression> {
        return this.dependents.get(expression) ?? new Set();
    }

    entries(): [Expression, Set<Expression>][] {
        return Array.from(this.dependents.entries());
    }
}

/**
 * A key that is equal for two conflicts only when they are the same complaint
 * about the same nodes.
 *
 * Node **identity**, not structure. `Conflict.isEqualTo` compares its node
 * fields structurally, and twenty references to one misspelled name are twenty
 * structurally identical `Reference`s — so deduplicating with it collapsed
 * conflicts at twenty different places in a program into one, and the creator
 * saw the mistake underlined in two of the places it was actually made. Across
 * the shipped examples that dropped 210 of 639 conflicts while catching no
 * genuine duplicates at all. It was also quadratic, and about half of analysis
 * time on a program with a few thousand conflicts.
 */
function conflictKey(conflict: Conflict): string {
    const ids = Object.values(conflict)
        .filter((field): field is Node => field instanceof Node)
        .map((node) => node.id);
    return `${conflict.constructor.name}:${ids.join(',')}`;
}

/** The given conflicts with exact duplicates removed, in their original order. */
export function dedupeConflicts(conflicts: Conflict[]): Conflict[] {
    const seen = new Set<string>();
    return conflicts.filter((conflict) => {
        const key = conflictKey(conflict);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Everything a completed analysis knows, in the order it is derived: the call
 * graph first, then the dependency graph that reads it, then the conflicts that
 * may read either.
 */
export type Analysis = {
    calls: CallGraph;
    dependencies: DependencyGraph;
    conflicts: Conflict[];
    /** The node each conflict is attributed to. A node belongs to one source,
     * but a conflict may point at one in another, so merging unions rather than
     * overwrites. */
    conflictedNodes: Map<Node, Conflict[]>;
};

/** One source's share of an {@link Analysis}, cached so an edit to one source
 * doesn't re-derive every other source's. Same shape as the whole, since
 * merging is just unioning the pieces. */
export type SourceAnalysis = Analysis;

/**
 * The layers built so far while an analysis is running. A layer is `undefined`
 * until its phase completes, so anything reading one mid-analysis has to say
 * what it does without it. See {@link CallGraph} for why the order is fixed.
 */
export type AnalysisInProgress = {
    calls: CallGraph | undefined;
    dependencies: DependencyGraph | undefined;
};

/** Where a project is in the three phases above. */
export type AnalysisState =
    | { kind: 'unanalyzed' }
    | { kind: 'analyzing'; partial: AnalysisInProgress }
    | { kind: 'analyzed'; analysis: Analysis };

export function emptyAnalysis(): Analysis {
    return {
        calls: new CallGraph(),
        dependencies: new DependencyGraph(),
        conflicts: [],
        conflictedNodes: new Map(),
    };
}

/** Fold one analysis's conflicts into another's. */
export function mergeConflicts(into: Analysis, from: Analysis) {
    into.conflicts = into.conflicts.concat(from.conflicts);
    for (const [node, conflicts] of from.conflictedNodes)
        into.conflictedNodes.set(node, [
            ...(into.conflictedNodes.get(node) ?? []),
            ...conflicts,
        ]);
}
