import Sym from '../nodes/Sym';
import Token from '../nodes/Token';
import type Spaces from './Spaces';

export default class Tokens {
    /** The tokens that have yet to be read. */
    readonly #unread: Token[];

    /** The tokens that have been read. */
    readonly #read: Token[] = [];

    /** The preceding space for each token */
    readonly #spaces;

    /**
     * A stack indicating whether reactions are currently allowed to be parsed.
     * We keep it here to avoid having to pass it around parsing function signatures.
     */
    readonly reactive: boolean[] = [true];

    constructor(tokens: Token[], spaces: Spaces) {
        this.#unread = tokens.slice();
        this.#spaces = spaces;
    }

    /** Returns the text of the next token */
    peek(): Token | undefined {
        return this.hasNext() ? this.#unread[0] : undefined;
    }

    /** Returns the text of the next token */
    peekText(): string | undefined {
        return this.hasNext() ? this.#unread[0].text.toString() : undefined;
    }

    /** Get the space of the next token */
    peekSpace(): string | undefined {
        return this.hasNext()
            ? this.#spaces.getSpace(this.#unread[0])
            : undefined;
    }

    getSpaces() {
        return this.#spaces;
    }

    remaining() {
        return this.#unread.length;
    }

    peekUnread() {
        return this.#unread.slice();
    }

    /** Returns true if the token list isn't empty. */
    hasNext(): boolean {
        return this.#unread.length > 0 && !this.#unread[0].isSymbol(Sym.End);
    }

    nextIsEnd(): boolean {
        return this.#unread.length > 0 && this.#unread[0].isSymbol(Sym.End);
    }

    /** Returns true if and only if the next token is the specified type. */
    nextIs(type: Sym, text?: string): boolean {
        return (
            this.hasNext() &&
            this.peek()?.isSymbol(type) === true &&
            (text === undefined || this.peekText() === text)
        );
    }

    /** Returns true if and only if there is a next token and it's not the specified type. */
    nextIsnt(type: Sym): boolean {
        return this.hasNext() && this.peek()?.isntSymbol(type) === true;
    }

    /** Returns true if and only if the next series of tokens matches the series of given token types. */
    nextAre(...types: Sym[]) {
        return types.every(
            (type, index) =>
                index < this.#unread.length &&
                this.#unread[index].isSymbol(type),
        );
    }

    /** Returns true if and only there was a previous token and it was of the given type. */
    previousWas(type: Sym): boolean {
        return (
            this.#read.length > 0 &&
            this.#read[this.#read.length - 1].isSymbol(type)
        );
    }

    beforeNextLineIs(type: Sym) {
        // To detect this, we'll just peek ahead and see if there's a bind before the next line.
        let index = 0;
        while (index < this.#unread.length) {
            const token = this.#unread[index];
            if (index > 0 && this.#spaces.hasLineBreak(this.#unread[index]))
                break;
            if (token.isSymbol(type)) break;
            index++;
        }
        // If we found a bind, it's a bind.
        return (
            index < this.#unread.length && this.#unread[index].isSymbol(type)
        );
    }

    nextIsOneOf(...types: Sym[]): boolean {
        return types.find((type) => this.nextIs(type)) !== undefined;
    }

    /** Returns true if and only if the next token has no preceding space. */
    nextLacksPrecedingSpace(): boolean {
        return this.hasNext() && !this.#spaces.hasSpace(this.#unread[0]);
    }

    /** Returns true if and only if the next token is the specified type. */
    afterLacksPrecedingSpace(): boolean {
        const after = this.#unread[1];
        return (
            after !== undefined &&
            !after.isSymbol(Sym.End) &&
            !this.#spaces.hasSpace(after)
        );
    }

    afterNextIs(type: Sym) {
        const after = this.#unread[1];
        return after !== undefined && after.isSymbol(type);
    }

    hasAfter(): boolean {
        const after = this.#unread[1];
        return (
            after !== undefined &&
            !after.isSymbol(Sym.End) &&
            !after.isSymbol(Sym.Code)
        );
    }

    nextIsUnary(): boolean {
        return (
            this.nextIs(Sym.Operator) &&
            this.hasAfter() &&
            this.afterLacksPrecedingSpace()
        );
    }

    /** Returns true if and only if the next token has a preceding line break. */
    nextHasPrecedingLineBreak(): boolean | undefined {
        return !this.hasNext()
            ? undefined
            : this.#spaces.hasLineBreak(this.#unread[0]);
    }

    /** Returns true if there's a space ahead with more than one line break */
    nextHasMoreThanOneLineBreak(): boolean {
        return (this.peekSpace() ?? '').split('\n').length - 1 >= 2;
    }

    /** Returns a token list without the first token. */
    read(expectedType?: Sym): Token {
        const next = this.#unread.shift();
        if (next !== undefined) {
            if (expectedType !== undefined && !next.isSymbol(expectedType)) {
                throw new Error(
                    `Internal parsing error at ${this.#read
                        .slice(this.#read.length - 10, this.#read.length)
                        .map((t) => t.toWordplay())
                        .join('')} *** ${this.#unread
                        .slice(0, 10)
                        .map((t) => t.toWordplay())
                        .join('')}; expected ${expectedType}, received ${
                        next.types
                    }`,
                );
            }
            this.#read.push(next);
            return next;
        } else return new Token('', Sym.End);
    }

    readIf(type: Sym) {
        return this.nextIs(type) ? this.read() : undefined;
    }

    /** Used to read the remainder of a line, unless there are no more tokens, or we reach the end of a code example. */
    readLine() {
        const nodes: Token[] = [];
        let onFirst = true;

        if (!this.hasNext()) return nodes;
        // If there are more tokens, and and it's not the end of a code block in markup, and we're either on the first token, or the next token has a line break, read another token.
        this.whileDo(
            () =>
                this.hasNext() &&
                (onFirst === true ||
                    this.nextHasPrecedingLineBreak() === false) &&
                this.nextIsnt(Sym.Code),
            () => {
                const next = this.read();
                onFirst = false;
                nodes.push(next);
            },
        );
        return nodes;
    }

    /**
     * Checks a condition, if if true, does something, then checks again.
     * If the action returns false, we stop.
     * If the action doesn't consume a token, we stop, to prevent infinite loops.
     **/
    whileDo(condition: () => boolean, action: () => unknown) {
        while (condition()) {
            const currentToken = this.peek();
            if (action() === false) break;
            // If we didn't advance, then we're stuck in an infinite loop. Break.
            if (currentToken === this.peek()) break;
        }
    }

    /**
     * Completes an action, then checks a condition, and stops if false, otherwise repeats. If the action returns false, we stop.
     * If the action doesn't consume a token, we stop, to prevent infinite loops.
     **/
    doWhile(action: () => unknown, condition: () => boolean) {
        do {
            const currentToken = this.peek();
            if (action() === false) break;
            // If we didn't advance, then we're stuck in an infinite loop. Break.
            if (currentToken === this.peek()) break;
        } while (condition());
    }

    /** Rollback to the given token. */
    unreadTo(token: Token) {
        while (this.#read.length > 0 && this.#unread[0] !== token) {
            const unreadToken = this.#read.pop();
            if (unreadToken !== undefined) this.#unread.unshift(unreadToken);
        }
    }

    /** Mark that reads can parse reactions. */
    pushReactionAllowed(reactive: boolean) {
        return this.reactive.push(reactive);
    }

    /** Revert to previous reactions allowed state  */
    popReactionAllowed() {
        return this.reactive.pop();
    }

    /** See whether reactions are currently allowed. */
    reactionsAllowed() {
        return this.reactive.at(-1);
    }
}
