import type Token from '#nodes/Token.ts';
import Spaces from '#parser/Spaces.ts';

/**
 * What tokenizing learned about a list of tokens, by position in the list rather than by
 * token, since a reparse swaps in the tokens of the previous parse wherever they are equal.
 */
export type Lexical = {
    /**
     * For each token, where it was read: the number of code examples and interpolations
     * (`\…\`) around it, or that number negated less one if it was read as text, markup, or
     * a pattern rather than as code. Delimiters are only structure in code, and only pair
     * within one example.
     */
    readonly contexts: readonly number[];
    /** The positions of delimiters that turned out to open or close nothing. */
    readonly strays: readonly number[];
    /** The positions of the delimiters that opened something a repair ended without a
     *  close. Whatever follows one, even a delimiter of its own kind, is not its close. */
    readonly unclosed: readonly number[];
    /** The positions of the tokens that follow an example or interpolation that was never
     *  closed, which is where it was taken to end. */
    readonly ends: readonly number[];
    /** True if something was left unclosed, and so recovering from it had to guess. */
    readonly damaged: boolean;
};

/** For tokens that were never text, which are all code. */
export const NoLexical: Lexical = {
    contexts: [],
    strays: [],
    unclosed: [],
    ends: [],
    damaged: false,
};

export default class TokenList {
    readonly #tokens: Token[];
    readonly #spaces: Spaces;
    readonly #lexical: Lexical;

    constructor(
        tokens: Token[],
        spaces: Map<Token, string>,
        lexical: Lexical = NoLexical,
    ) {
        this.#tokens = [...tokens];
        this.#spaces = new Spaces(this, spaces);
        this.#lexical = lexical;
    }

    /** What the tokenizer knew about each token that the tokens themselves don't say. */
    getLexical() {
        return this.#lexical;
    }

    getTokens() {
        return [...this.#tokens];
    }
    getSpaces() {
        return this.#spaces;
    }

    getNextToken(token: Token, direction: 1 | -1): Token | undefined {
        const index = this.#tokens.indexOf(token);
        return index < 0 ||
            index + direction < 0 ||
            index + direction >= this.#tokens.length
            ? undefined
            : this.#tokens[index + direction];
    }
}
