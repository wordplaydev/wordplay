import type Project from '@db/projects/Project';
import type LocaleText from '@locale/LocaleText';
import type { InternalConflictText } from '@locale/NodeTexts';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Locales from '../locale/Locales';
import type Markup from '../nodes/Markup';

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
) => InternalConflictText;

export default abstract class Conflict {
    readonly #minor: boolean;

    constructor(minor: boolean) {
        this.#minor = minor;
    }

    /**
     * There are two types of conflicting nodes: "primary" ones, which ostensibly caused the conflict,
     * and "secondary" ones, which are involved. We use this distiction in the editor to decide what to highlight,
     * but also how to position the various parties involved in the visual portrayal of the conflict.
     */
    abstract getConflictingNodes(
        context: Context,
        concepts: Node[],
    ): {
        primary: ConflictingNode;
        secondary?: ConflictingNode;
        resolutions?: Resolution[];
    };

    isMinor() {
        return this.#minor;
    }

    toString() {
        return this.constructor.name;
    }

    abstract getLocalePath(): ConflictLocaleAccessor;
}
