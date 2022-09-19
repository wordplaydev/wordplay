import type Node from "../nodes/Node";
import type { LanguageCode } from "../nodes/LanguageCode";

export type ConflictExplanations = Record<LanguageCode, string>;

export default abstract class Conflict {
    readonly #minor: boolean;
    
    constructor(minor: boolean) { this.#minor = minor; }

    /** 
     * There are two types of conflicting nodes: "primary" ones, which ostensibly caused the conflict, 
     * and "secondary" ones, which are involved. We use this distiction in the editor to decide what to highlight, 
     * but also how to position the various parties involved in the visual portrayal of the conflict.
     */
    abstract getConflictingNodes(): { primary: Node[], secondary?: Node[] };
    abstract getExplanations(): ConflictExplanations;

    isMinor() { return this.#minor; }
    getExplanation(lang: LanguageCode): string { return this.getExplanations()[lang]; }
    toString() { return this.constructor.name; }


}