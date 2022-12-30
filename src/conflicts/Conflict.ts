import type Node from '../nodes/Node';
import type LanguageCode from '../nodes/LanguageCode';
import type Translations from '../nodes/Translations';
import type Context from '../nodes/Context';
import { WRITE_DOCS } from '../nodes/Translations';

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
    abstract getConflictingNodes(): { primary: Node; secondary: Node[] };
    abstract getPrimaryExplanation(context: Context): Translations;
    getSecondaryExplanation(_: Context): Translations {
        return WRITE_DOCS;
    }

    isMinor() {
        return this.#minor;
    }
    getExplanation(context: Context, lang: LanguageCode): string {
        return this.getPrimaryExplanation(context)[lang];
    }
    toString() {
        return this.constructor.name;
    }
}
