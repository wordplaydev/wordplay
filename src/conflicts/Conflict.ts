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
     * Suggested fixes for this conflict. Default returns no resolutions; override in
     * subclasses that can compute them. Called lazily — typically once, only when
     * an annotation is rendered — so this is the right place for expensive inference.
     */
    getResolutions(_context: Context, _concepts: Node[]): Resolution[] {
        return [];
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
