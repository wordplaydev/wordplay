/**
 * A resolved reference to a glossary term, produced when an `@term` reference
 * resolves to a glossary entry. Mirrors {@link ConceptRef}: a tiny plain object
 * (not an AST node) that flows through markup concretization as a segment and is
 * rendered interactively by `TermView`. Carries the glossary id (to look up the
 * definition) and the localized word (what to display).
 */
export default class TermRef {
    /** The glossary id, e.g. 'value' — used to resolve the definition. */
    readonly id: string;
    /** The localized word to display, e.g. 'value' / 'valor'. */
    readonly word: string;

    constructor(id: string, word: string) {
        this.id = id;
        this.word = word;
    }

    getDescription() {
        return this.word;
    }

    toText() {
        return this.word;
    }
}
