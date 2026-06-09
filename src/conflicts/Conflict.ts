import type Project from '@db/projects/Project';
import type LocaleText from '@locale/LocaleText';
import type { ConflictText } from '@locale/NodeTexts';
import type Context from '@nodes/Context';
import Node from '@nodes/Node';
import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';

/**
 * How severe a conflict is, and — for blocks mode — whether it blocks an edit. Defined with the
 * codebase's enum-replacement pattern (an `as const` object + companion type) rather than a TS `enum`,
 * so there's no runtime reverse-mapping baggage, just type safety.
 */
const ConflictSeverity = {
    /** Cosmetic / in-progress; never blocks. Rendered as a minor annotation. (placeholders, unused binds, PII…) */
    Minor: 'minor',
    /** A real (major/red) issue we permit while editing so learners can work through it — type mismatches. Never blocks. */
    Warning: 'warning',
    /** A structural/error-level problem. Rendered as a major annotation AND blocks blocks-mode edits
     *  (typing, paste, drop): unparsable code, missing input, unknown name, … */
    Error: 'error',
} as const;
export type ConflictSeverity =
    (typeof ConflictSeverity)[keyof typeof ConflictSeverity];
export { ConflictSeverity };

type ConflictingNode = {
    node: Node;
    explanation: (locales: Locales, context: Context) => Markup;
};

/**
 * A repair-kind {@link Resolution}: clicking applies the mediator's project
 * transformation. The original {@link Resolution} shape, now explicitly tagged.
 */
export type Repair = {
    kind: 'repair';
    /** Localized description of what this fix will do. */
    description: (locales: Locales, context: Context) => Markup;
    /**
     * Given a project, returns a new project where this conflict is resolved
     * (and optionally a node to focus afterwards).
     */
    mediator: (
        context: Context,
        locales: Locales,
    ) => { newProject: Project; newNode?: Node };
};

/**
 * An explain-kind {@link Resolution}: no auto-fix exists, but the conflict
 * author has documented what's going on. The UI renders this without an apply
 * button; clicking navigates the caret to {@link focusNode} (when provided) so
 * the learner can act manually.
 */
export type Explainer = {
    kind: 'explain';
    /** Localized description of why this conflict happened and what to do. */
    description: (locales: Locales, context: Context) => Markup;
    /** Optional node to focus when the learner activates this resolution. */
    focusNode?: Node;
};

/**
 * One suggested fix or guided explanation for a conflict. Discriminated by
 * `kind` so the UI can render apply-style affordances for repairs and
 * navigate-style affordances for explainers.
 */
export type Resolution = Repair | Explainer;

/**
 * A non-empty list of resolutions. Every concrete {@link Conflict} subclass
 * must produce at least one — TypeScript rejects an empty `[]` literal at the
 * return site, which is how we enforce "every conflict has a resolution"
 * for new conflicts (see issue #827).
 */
export type Resolutions = readonly [Resolution, ...Resolution[]];

export type ConflictLocaleAccessor = (
    locale: LocaleText,
) => ConflictText<readonly string[]>;

/**
 * A function that produces resolutions for a specific conflict class. Stored in
 * the {@link resolvers} registry, keyed by the conflict's constructor.
 *
 * Resolvers may return zero results (heuristic inference didn't find anything
 * usable); {@link Conflict.fromRegistry} synthesises a fallback explainer in
 * that case so the non-empty {@link Resolutions} invariant always holds.
 */
export type Resolver<C extends Conflict> = (
    conflict: C,
    context: Context,
    concepts: Node[],
) => Resolution[];

/**
 * Registry of resolver functions keyed by conflict constructor. Populated by
 * `src/conflicts/registerTypeResolutions.ts`, which is side-effect-imported by
 * the app entry and the Vitest `setupFiles`. The indirection breaks an ES
 * module cycle: many node files import their conflicts directly, so a conflict
 * file that *also* imported node-constructing helper code would form a cycle.
 * Resolvers live in a separate module that's only loaded after all node
 * classes have initialized.
 */
const resolvers = new Map<Function, Resolver<Conflict>>();

/**
 * Register a resolver for a conflict class. Call once per class at app /
 * test startup. Subsequent calls overwrite (the last registration wins, which
 * makes overriding in tests easy).
 *
 * The single `as unknown as` widening here is the only cast in the registry —
 * it's safe because `registerResolver` enforces the narrow `Resolver<C>` type
 * at the call site, and {@link Conflict.fromRegistry} looks up by exact
 * constructor identity, so the stored function is only ever invoked with an
 * instance of the registered class.
 */
export function registerResolver<C extends Conflict>(
    cls: new (...args: never[]) => C,
    fn: Resolver<C>,
): void {
    resolvers.set(cls, fn as unknown as Resolver<Conflict>);
}

export default abstract class Conflict {
    readonly #severity: ConflictSeverity;

    constructor(severity: ConflictSeverity) {
        this.#severity = severity;
    }

    /**
     * Conflicting nodes have primary nodes to be highlighted plus a localized explanation.
     * Resolutions are returned separately by {@link getResolutions} so the heavy inference
     * they require only runs when an annotation is actually displayed.
     */
    abstract getMessage(context: Context, concepts: Node[]): ConflictingNode;

    /**
     * Cheap accessor for just the primary conflicting node — used by code that draws
     * underlines or counts conflicts and doesn't need the full message.
     */
    getConflictingNode(context: Context, concepts: Node[]): Node {
        return this.getMessage(context, concepts).node;
    }

    /**
     * Suggested fixes (repairs) or guided explanations for this conflict.
     *
     * Every concrete subclass must implement this and return at least one
     * {@link Resolution} (issue #827). The {@link Resolutions} non-empty tuple
     * return type makes a forgotten override a compile error.
     *
     * For type-mismatch conflicts that need to construct node trees in their
     * resolution logic, override with a one-liner that delegates to
     * {@link Conflict.fromRegistry} — that pattern keeps node-constructing
     * code in `registerTypeResolutions.ts`, avoiding an ES module cycle.
     *
     * For conflicts where no auto-repair is practical, delegate to
     * {@link Conflict.fallbackExplainer}, which synthesises a single explainer
     * from the conflict's primary message — every conflict thus offers at
     * least one resolution.
     */
    abstract getResolutions(context: Context, concepts: Node[]): Resolutions;

    /**
     * Build a single {@link Explainer}-kind resolution from this conflict's
     * primary message. The default "no auto-fix; here's where to look" shape
     * for any conflict whose repair needs human judgment.
     */
    static fallbackExplainer(
        conflict: Conflict,
        context: Context,
        concepts: Node[],
    ): Resolutions {
        const message = conflict.getMessage(context, concepts);
        return [
            {
                kind: 'explain',
                description: message.explanation,
                focusNode: message.node,
            },
        ];
    }

    /**
     * For conflict subclasses that have a resolver registered in
     * `registerTypeResolutions.ts`. Looks up the registered resolver, runs it,
     * and synthesises a fallback explainer (from the conflict's primary
     * message) when the inference finds nothing — so the non-empty invariant
     * holds even when heuristic inference returns zero results.
     */
    static fromRegistry(
        conflict: Conflict,
        context: Context,
        concepts: Node[],
    ): Resolutions {
        const resolver = resolvers.get(conflict.constructor);
        const found = resolver ? resolver(conflict, context, concepts) : [];
        if (found.length > 0)
            return found as readonly Resolution[] as Resolutions;
        // No registered resolver, or the resolver produced nothing usable.
        // Fall back to an explainer that simply re-states the conflict's
        // primary message, focusing the conflicting node.
        return Conflict.fallbackExplainer(conflict, context, concepts);
    }

    /** True only for Minor-severity conflicts. Preserved for annotation coloring, the error-count badge,
     *  and highlight code — Warning and Error both remain "major". */
    isMinor() {
        return this.#severity === ConflictSeverity.Minor;
    }

    /** True only for Error-severity conflicts: blocks-mode edits (typing, paste, drop) are rejected
     *  when they introduce one of these. Warning and Minor are permitted. */
    isBlocking() {
        return this.#severity === ConflictSeverity.Error;
    }

    getSeverity() {
        return this.#severity;
    }

    toString() {
        return this.constructor.name;
    }

    /** A conflict is equal if it's the same constructor, the same number of nodes, and all nodes are equivalent. */
    isEqualTo(other: Conflict): boolean {
        if (this.constructor !== other.constructor) return false;
        const theseNodes = Object.values(this).filter((f) => f instanceof Node);
        const thoseNodes = Object.values(other).filter(
            (f) => f instanceof Node,
        );
        if (theseNodes.length !== thoseNodes.length) return false;
        return theseNodes.every((these, index) =>
            these.isEqualTo(thoseNodes[index]),
        );
    }

    abstract getLocalePath(): ConflictLocaleAccessor;
}
