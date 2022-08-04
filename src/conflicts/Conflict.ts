
export default abstract class Conflict {
    readonly #minor: boolean;
    constructor(minor: boolean) { this.#minor = minor; }
    isMinor() { return this.#minor; }
    toString() { return this.constructor.name; }
}

