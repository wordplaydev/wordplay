import ValueRef from '@locale/ValueRef';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import type Locales from '@locale/Locales';
import type Bind from '@nodes/Bind';
import type { CallGraph } from '@db/projects/Analysis';
import type Context from '@nodes/Context';
import type Markup from '@nodes/Markup';
import Node from '@nodes/Node';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';

export const ExpressionKind = {
    Simple: 'simple',
    Evaluate: 'block',
    Definition: 'definition',
} as const;
export type ExpressionKind =
    (typeof ExpressionKind)[keyof typeof ExpressionKind];

export default abstract class Expression extends Node {
    constructor() {
        super();
    }

    /**
     * True if the expression is involved in triggering an evaluation. Used to decide whether to present
     * as code or value during stepping.
     */
    isEvaluationInvolved() {
        return false;
    }
    isEvaluationRoot() {
        return false;
    }

    /** True if expression is internal and should never be memoized */
    isInternal() {
        return false;
    }

    /** True if the given node determines branching on this node */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasBranch(_: Expression) {
        return false;
    }

    /** True if binary operations can be applied to this without wrapping it in parentheses */

    abstract computeType(context: Context): Type;

    getType(context: Context): Type {
        return context.getType(this);
    }

    /**
     * Whether this expression's value can be proven non-zero statically, so
     * that `÷`/`%` by it can never yield ø. Conservative: anything not provable
     * (division results, stream values, runtime lengths) returns false and
     * keeps the `# | ø` type. Overridden by NumberLiteral, Reference, and
     * Evaluate (for `.length()` of literal collections). `depth` bounds how far
     * references are followed upstream through binds.
     */
    isProvablyNonZero(_: Context, _depth = 0): boolean {
        return false;
    }

    /**
     * The statically-known element count of this expression if it's a literal
     * collection (list, set, map, or table) whose size is fixed, otherwise
     * undefined. Used to prove a `.length()` divisor is non-zero.
     */
    getConstantLength(_?: Context): number | undefined {
        return undefined;
    }

    /**
     * Whether this expression is a `÷`/`%` whose divisor could be zero, so it
     * can evaluate to ø. Overridden by BinaryEvaluate; used to explain an
     * unhandled ø as a possible divide-by-zero.
     */
    isPossibleDivideByZero(_: Context): boolean {
        return false;
    }

    /**
     * The type of the value this expression is accessed on, if it's a property
     * or method reference (e.g. the `x` in `x.f`). Undefined for everything
     * else. Overridden by PropertyReference; lets callers find a method call's
     * receiver type without importing PropertyReference.
     */
    getSubjectType(_: Context): Type | undefined {
        return undefined;
    }

    abstract getDependencies(_: Context): Expression[];

    /**
     * This expression's dependencies, plus any that only a call graph reveals.
     * Overridden by `Bind`, whose value comes from whoever calls the definition
     * it is an input of. Separate from `getDependencies` because the project
     * derives those caller edges itself from the finished call graph, and a node
     * asking for them mid-analysis is what #808 was about.
     */
    getExtendedDependencies(context: Context, _?: CallGraph): Expression[] {
        return this.getDependencies(context);
    }

    /**
     * Every expression this one transitively depends on.
     *
     * Pass `calls` to follow a function's input binds out to the calls that
     * decide their values — a stream handed to a function is only reachable
     * that way. It is optional and not merely for convenience: the call graph
     * does not exist during the phase of analysis that builds it, and a caller
     * that has no graph must say what it does without one rather than get a
     * silently truncated walk. See #808.
     */
    getAllDependencies(
        context: Context,
        dependencies?: Set<Expression>,
        calls?: CallGraph,
    ): Set<Expression> {
        // Keep track of whether this is the first in the recursive change of dependencies, so we
        // can remove it from the dependency list. (The list should only contain dependencies, not the initial expression
        // for which we're getting dependencies.)
        let start = false;
        // No list yet? Make one and add this.
        if (dependencies === undefined) {
            start = true;
            dependencies = new Set();
        }
        // Already visited this? Don't visit it again.
        else if (dependencies.has(this)) return dependencies;

        // Visit this.
        dependencies.add(this);

        // Get all dependencies of this, plus any this node reaches only through
        // the call graph (see Bind's override).
        for (const dep of this.getExtendedDependencies(context, calls))
            dep.getAllDependencies(context, dependencies, calls);

        // Don't include this if we started with it.
        if (start) dependencies.delete(this);

        // Return the final list of dependencies.
        return dependencies;
    }

    /** By default, an expression is constant if all of it's dependencies are constant. */
    isConstant(context: Context): boolean {
        // Get the expression's dependencies.
        const dependencies = this.getDependencies(context);
        // Ask the project if the dependency is constant. We ask the project since it's responsible
        // for caching whether an expression is constant and preventing cycles.
        return Array.from(dependencies).every((dependency) =>
            context.project.isConstant(dependency),
        );
    }

    /**
     * Used to determine what types are possible for a given after evaluating this expression, implementing type guards.
     * Most expressions do not manipulate possible types at all; primarily is just logical operators and type checks.
     * */
    abstract evaluateTypeGuards(
        current: TypeSet,
        context: GuardContext,
    ): TypeSet;

    /** Used to check if the given expression matches guarded expression. By default, no.
     * Subclasses should override if they can match a guarded expression.
     */
    isGuardMatch(guard: GuardContext) {
        guard;
        return false;
    }

    /** Used to decide whether to consider an expression as filtering types based on the behavior of evaluateTypeGuards() */
    guardsTypes() {
        return false;
    }

    abstract compile(evaluator: Evaluator, context: Context): Step[];
    abstract evaluate(evaluator: Evaluator, prior: Value | undefined): Value;

    abstract getStart(): Node;
    abstract getFinish(): Node;

    abstract getStartExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ): Markup;

    abstract getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ): Markup;

    /** Utility function for getting an optional result  */
    getValueIfDefined(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        const value =
            evaluator.peekValue() ?? evaluator.getLatestExpressionValue(this);
        return value ? new ValueRef(value, locales, context) : undefined;
    }

    /** Get the kind of node, for highlighting or other purposes */
    getKind(): ExpressionKind {
        return ExpressionKind.Evaluate;
    }
}

/** Info we pass around to implement type guards. Encapsulated for extensibility. */
export type GuardContext = {
    bind: Bind;
    key: string;
    context: Context;
    /**
     * The binds whose values we're currently expanding, to evaluate a check held in a
     * name (`ok: map{key} ≠ ø`, used as `ok ? …`). It does two jobs. It bounds the
     * expansion, since binds can name each other — a conflict, not a parse error, so
     * this analysis still runs on that code. And a non-empty set means we're inside a
     * definition rather than at a use site, where a narrowed type must NOT be
     * recorded: reference types are keyed by node identity and outlive the traversal,
     * so one recorded inside a bind's value would leak a single branch's narrowing
     * into every use of that bind.
     */
    expanding?: Set<Bind>;
};

/** Whether a narrowed type may be recorded: only at a use site, never inside a bind's
 *  definition we're expanding. See GuardContext.expanding. */
export function canRecordGuard(guard: GuardContext) {
    return guard.expanding === undefined || guard.expanding.size === 0;
}
