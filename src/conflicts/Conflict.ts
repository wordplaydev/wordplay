import type Node from "../nodes/Node";
import type { LanguageCode } from "../nodes/LanguageCode";

export type ConflictExplanations = Record<LanguageCode, string>;

export default abstract class Conflict {
    readonly #minor: boolean;
    
    constructor(minor: boolean) { this.#minor = minor; }
    
    isMinor() { return this.#minor; }
    toString() { return this.constructor.name; }
    getConflictingNodes(): Node[] { return [] };
    getExplanations(): ConflictExplanations { return { eng: this.constructor.name }}
    getExplanation(lang: LanguageCode): string { return this.getExplanations()[lang]; }

}