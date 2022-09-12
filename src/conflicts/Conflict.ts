import type Node from "../nodes/Node";
import type { LanguageCode } from "../nodes/LanguageCode";

export type ConflictExplanations = Record<LanguageCode, string>;

export default abstract class Conflict {
    readonly #minor: boolean;
    
    constructor(minor: boolean) { this.#minor = minor; }

    abstract getConflictingNodes(): Node[];
    abstract getExplanations(): ConflictExplanations;

    isMinor() { return this.#minor; }
    getExplanation(lang: LanguageCode): string { return this.getExplanations()[lang]; }
    toString() { return this.constructor.name; }


}