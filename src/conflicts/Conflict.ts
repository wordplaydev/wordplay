import type Node from '../nodes/Node';
import type Context from '../nodes/Context';
import type Translation from '../translations/Translation';
import type { Description } from '../translations/Translation';

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
    abstract getConflictingNodes(): { primary: Node; secondary?: Node };

    abstract getPrimaryExplanation(
        translation: Translation,
        context: Context
    ): Description;

    abstract getSecondaryExplanation(
        translation: Translation,
        context: Context
    ): Description | undefined;

    isMinor() {
        return this.#minor;
    }

    toString() {
        return this.constructor.name;
    }
}
