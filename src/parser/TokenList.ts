import type Token from "../nodes/Token";
import type Root from "./Root";
import Spaces from "./Spaces";

export default class TokenList implements Root {

    readonly #tokens: Token[];
    readonly #spaces: Spaces;

    constructor(tokens: Token[], spaces: Map<Token, string>) {
    
        this.#tokens = [...tokens];
        this.#spaces = new Spaces(this, spaces);

    }

    getTokens() { return [...this.#tokens]; }
    getSpaces() { return this.#spaces; }

    getNextToken(token: Token, direction: 1 | -1): Token | undefined {
        const index = this.#tokens.indexOf(token);
        return index < 0 || index + direction < 0 || index + direction >= this.#tokens.length ? 
            undefined :
            this.#tokens[index + direction];
    }

}