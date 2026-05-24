import type Project from '@db/projects/Project';
import type LocaleText from '@locale/LocaleText';
import type { ConflictText } from '@locale/NodeTexts';
import type Context from '@nodes/Context';
import Node from '@nodes/Node';
import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';

type ConflictingNode = {
    node: Node;
    explanation: (locales: Locales, context: Context) => Markup;
};

export type Resolution = {
    /** Should return a description fo the resolution. */
    description: (locales: Locales, context: Context) => Markup;
    /** Given a project, should create a new project that resolves the conflict and offer an optional node that was added or revised. */
    mediator: (
        context: Context,
        locales: Locales,
    ) => { newProject: Project; newNode?: Node };
};

export type ConflictLocaleAccessor = (
    locale: LocaleText,
) => ConflictText<readonly string[]>;

/**
 * A function that produces resolutions for a specific conflict class. Stored in
 * the {@link resolvers} registry, keyed by the conflict's constructor.
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
 * at the call site, and {@link Conflict.getResolutions} looks up by exact
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
    readonly #minor: boolean;

    constructor(minor: boolean) {
        this.#minor = minor;
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
     * Suggested fixes for this conflict. Looks up a resolver in the
     * {@link resolvers} registry by constructor; returns `[]` when none is
     * registered. Subclasses that ship their own resolutions and don't suffer
     * the conflict↔node module cycle (e.g. UnknownName, DuplicateName,
     * PossiblePII) may override this directly. Type-mismatch conflicts route
     * through the registry instead — see `registerTypeResolutions.ts`.
     */
    getResolutions(context: Context, concepts: Node[]): Resolution[] {
        const resolver = resolvers.get(this.constructor);
        return resolver ? resolver(this, context, concepts) : [];
    }

    isMinor() {
        return this.#minor;
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
