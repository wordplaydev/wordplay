import { Sym, type SymType } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import {
    analyzeDelimiters,
    closeKindOf,
    closeOpenedBy,
    type DelimiterRecovery,
} from '#parser/delimiterRecovery.ts';
import type Spaces from '#parser/Spaces.ts';
import type { Lexical } from '#parser/TokenList.ts';
import { NOT_SYMBOL } from '#parser/Symbols.ts';

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

    /** Every token given, for pairing delimiters the first time one is opened. */
    readonly #all: readonly Token[];
    #recovery: DelimiterRecovery | undefined = undefined;

    /** The closing delimiters that the constructs being read are waiting for, outermost first. */
    readonly #awaited: SymType[] = [];
    /** Where each of those constructs ends early because it is never closed, if it isn't. */
    readonly #boundaries: (Token | undefined)[] = [];
    /** How many of those there are, so that reading costs nothing more when there are none. */
    #bounded = 0;
    /** How many code examples are being read. */
    #examples = 0;
    /** The delimiters that opened text, markup or an example that was never closed. */
    readonly #unclosed = new Set<Token>();
    /** The tokens after examples that were never closed, where each stops being code. */
    readonly #ends = new Set<Token>();

    /** The opening delimiters put where one was missing. Each stands at the start of a
     *  line, whatever space it has, so it is never read as touching what came before it. */
    readonly #missing = new Set<Token>();

    /** What the tokenizer learned of the tokens, which says which delimiters are code. */
    readonly #lexical: Lexical;

    constructor(tokens: Token[], spaces: Spaces, lexical: Lexical) {
        this.#unread = tokens.slice();
        this.#all = tokens;
        this.#spaces = spaces;
        this.#lexical = lexical;
        for (const index of lexical.ends) {
            const token = tokens[index];
            if (token) this.#ends.add(token);
        }
        for (const index of lexical.unclosed) {
            const token = tokens[index];
            if (token) this.#unclosed.add(token);
        }
    }

    #getRecovery(): DelimiterRecovery {
        if (this.#recovery === undefined) {
            this.#recovery = analyzeDelimiters(
                this.#all,
                this.#spaces,
                this.#lexical,
            );
            // Put each opening delimiter that is missing where it was found to belong.
            // This is asked for before the first statement is read, so nothing is passed.
            for (const [before, opens] of this.#recovery.missing) {
                const index = this.#unread.indexOf(before);
                if (index >= 0) this.#unread.splice(index, 0, ...opens);
                for (const open of opens) this.#missing.add(open);
            }
        }
        return this.#recovery;
    }

    /** Begin reading the contents of a delimited construct, which end at `close`. */
    enter(open: Token, close: SymType) {
        const boundary = this.#getRecovery().boundary.get(open);
        this.#awaited.push(close);
        this.#boundaries.push(boundary);
        if (boundary) this.#bounded++;
    }

    /** Finish reading the contents of the construct last entered. */
    leave() {
        this.#awaited.pop();
        if (this.#boundaries.pop()) this.#bounded--;
    }

    /** Begin and finish reading a code example, in which a `\` ends it. */
    enterExample() {
        this.#examples++;
    }

    leaveExample() {
        this.#examples--;
        // Where an unclosed example ended, it has now ended, and what follows is read.
        const next = this.#unread[0];
        if (next) this.#ends.delete(next);
    }

    /** True if an opening delimiter is closed somewhere, but not by the next token. */
    nextIsBeforeCloseOf(open: Token): boolean {
        const close = this.#getRecovery().partner.get(open);
        return close !== undefined && this.hasNext() && this.peek() !== close;
    }

    /** True if the next token is a closing delimiter that closes nothing. */
    nextIsStray(): boolean {
        const stray = this.#getRecovery().stray;
        if (stray.size === 0) return false;
        const next = this.peek();
        return next !== undefined && stray.has(next);
    }

    /**
     * True if the contents of the construct being read end here: at a close that it or
     * an enclosing construct is waiting for, at the token an unclosed construct was judged
     * to end before, at an example boundary, or at the end. Stopping for an enclosing
     * construct's close is what keeps one missing delimiter from taking the rest of a program.
     */
    nextEndsContents(): boolean {
        const next = this.peek();
        if (next === undefined || next.isSymbol(Sym.Code)) return true;
        return this.nextIsAwaitedClose();
    }

    /** True if the next token closes a construct being read. */
    nextIsAwaitedClose(): boolean {
        const next = this.peek();
        const close = next === undefined ? undefined : closeKindOf(next);
        return (
            next !== undefined &&
            close !== undefined &&
            this.#awaited.includes(close) &&
            !this.#getRecovery().stray.has(next)
        );
    }

    /**
     * Read the delimiter that closes what the given one opened, if it is next. Not if what
     * it opened was found to have no close: text, documentation and examples open and close
     * with the same character, so the next one would otherwise be taken for it, when it is
     * the opening of something else.
     */
    readCloseOf(open: Token, type: SymType): Token | undefined {
        return this.#unclosed.has(open) ? undefined : this.readIf(type);
    }

    /** Read the close of the construct being read, if it is next. */
    readClose(type: SymType): Token | undefined {
        return this.nextIs(type) && !this.nextIsStray()
            ? this.read()
            : undefined;
    }

    /** Returns the text of the next token */
    peek(): Token | undefined {
        return this.hasNext() ? this.#unread[0] : undefined;
    }

    /** Returns the text of the next token */
    peekText(): string | undefined {
        return this.peek()?.text.toString();
    }

    /** Get the space of the next token */
    peekSpace(): string | undefined {
        const next = this.peek();
        return next === undefined ? undefined : this.#spaces.getSpace(next);
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

    /**
     * Returns true if the token list isn't empty. It is empty, to everything inside it, where
     * an unclosed construct being read was judged to end: checking only between a construct's
     * elements let whatever read an element read past that, and take the rest of the program.
     */
    hasNext(): boolean {
        const next = this.#unread[0];
        return (
            next?.isSymbol(Sym.End) === false &&
            (this.#bounded === 0 || !this.#boundaries.includes(next)) &&
            (this.#examples === 0 || !this.#ends.has(next))
        );
    }

    nextIsEnd(): boolean {
        return this.#unread[0]?.isSymbol(Sym.End) === true;
    }

    /** Returns true if and only if the next token is the specified type. */
    nextIs(type: SymType, text?: string): boolean {
        return (
            this.hasNext() &&
            this.peek()?.isSymbol(type) === true &&
            (text === undefined || this.peekText() === text)
        );
    }

    /** Returns true if and only if there is a next token and it's not the specified type. */
    nextIsnt(type: SymType): boolean {
        return this.hasNext() && this.peek()?.isntSymbol(type) === true;
    }

    /** Returns true if and only if the next series of tokens matches the series of given token types. */
    nextAre(...types: SymType[]) {
        return types.every(
            (type, index) => this.#unread[index]?.isSymbol(type) === true,
        );
    }

    /** Returns true if and only there was a previous token and it was of the given type. */
    previousWas(type: SymType): boolean {
        return this.#read.at(-1)?.isSymbol(type) === true;
    }

    beforeNextLineIs(type: SymType) {
        // To detect this, we'll just peek ahead and see if there's a bind before the next line.
        let index = 0;
        for (const token of this.#unread) {
            if (index > 0 && this.#spaces.hasLineBreak(token)) break;
            if (token.isSymbol(type)) break;
            index++;
        }
        // If we found a bind, it's a bind.
        return this.#unread[index]?.isSymbol(type) === true;
    }

    nextIsOneOf(...types: SymType[]): boolean {
        return types.find((type) => this.nextIs(type)) !== undefined;
    }

    /** Returns true if and only if the next token has no preceding space. */
    nextLacksPrecedingSpace(): boolean {
        const next = this.peek();
        return (
            next !== undefined &&
            !this.#spaces.hasSpace(next) &&
            !this.#missing.has(next)
        );
    }

    /** Returns true if and only if the next token has no preceding space. */
    afterNextLacksPrecedingSpace(): boolean {
        const after = this.#unread[1];
        return (
            this.#unread.length > 2 &&
            after !== undefined &&
            !this.#spaces.hasSpace(after)
        );
    }

    /** Returns true if and only if the next token is the specified type. */
    afterLacksPrecedingSpace(): boolean {
        const after = this.#unread[1];
        return (
            after !== undefined &&
            !after.isSymbol(Sym.End) &&
            !this.#spaces.hasSpace(after) &&
            !this.#missing.has(after)
        );
    }

    afterNextIs(type: SymType) {
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

    /** Whether the next token is a typed keyword word for ~ (logical not) in prefix position:
     * dual-typed [Name, Operator] with canonical ~, with an operand on the same line. A word
     * needs a space before its operand, so the symbol's no-space rule (nextIsUnary) becomes a
     * same-line rule; a trailing word at end of line stays a name, keeping shadows usable. */
    nextIsUnaryWord(): boolean {
        const next = this.#unread[0];
        const after = this.#unread[1];
        return (
            next !== undefined &&
            next.isSymbol(Sym.Name) &&
            next.isSymbol(Sym.Operator) &&
            next.getCanonicalText() === NOT_SYMBOL &&
            this.hasAfter() &&
            after !== undefined &&
            !this.#spaces.hasLineBreak(after)
        );
    }

    /** Returns true if and only if the next token has a preceding line break. */
    nextHasPrecedingLineBreak(): boolean | undefined {
        const next = this.peek();
        return next === undefined
            ? undefined
            : this.#spaces.hasLineBreak(next) || this.#missing.has(next);
    }

    /** Returns true if there's a space ahead with more than one line break */
    nextHasMoreThanOneLineBreak(): boolean {
        return (this.peekSpace() ?? '').split('\n').length - 1 >= 2;
    }

    /** Returns a token list without the first token. */
    read(expectedType?: SymType): Token {
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

    readIf(type: SymType) {
        return this.nextIs(type) ? this.read() : undefined;
    }

    /**
     * Used to read the remainder of a line, unless there are no more tokens, or we reach the end of a code example,
     * or a close that a construct being read is waiting for, so that what can't be parsed inside
     * a delimited construct doesn't take the construct's close with it.
     */
    readLine() {
        const nodes: Token[] = [];
        let onFirst = true;
        // The closes of the delimiters opened on this line, which belong to it.
        const opened: SymType[] = [];

        if (!this.hasNext()) return nodes;
        // If there are more tokens, and and it's not the end of a code block in markup, and we're either on the first token, or the next token has a line break, read another token.
        // Outside of any example, a `\` is not the end of one, and has to be read as
        // something: left unread, nothing after it is read either, and the rest of the
        // program is gone from the tree that the program's text is written back from.
        this.whileDo(
            () =>
                this.hasNext() &&
                (onFirst === true
                    ? this.#examples === 0 || this.nextIsnt(Sym.Code)
                    : this.nextHasPrecedingLineBreak() === false &&
                      (opened.length > 0 || !this.nextEndsContents()) &&
                      this.nextIsnt(Sym.Code)),
            () => {
                const next = this.read();
                onFirst = false;
                nodes.push(next);
                const close = closeOpenedBy(next);
                if (close !== undefined) opened.push(close);
                else if (closeKindOf(next) === opened.at(-1)) opened.pop();
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

    /** Inject a token at the front of the unread queue (used when splitting a Words token). */
    injectNext(token: Token): void {
        this.#unread.unshift(token);
    }

    /**
     * Everything a speculative parse can change, so it can be undone exactly.
     *
     * {@link unreadTo} can't do it on its own: parsing a doc can *split* a `Words`
     * token (see {@link injectNext}, which is how an example's `⭐`/`🪲` suffix is
     * separated from the words after it), leaving a token in the queue that was never
     * in the original list. Unreading then restores the original beside the injected
     * one and the text after an annotated example is parsed twice.
     */
    snapshot(): TokensSnapshot {
        return { read: [...this.#read], unread: [...this.#unread] };
    }

    /** Undo everything read or injected since {@link snapshot}. */
    restore(snapshot: TokensSnapshot) {
        replaceTokens(this.#read, snapshot.read);
        replaceTokens(this.#unread, snapshot.unread);
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

/** What {@link Tokens.snapshot} captures; opaque to callers. */
export type TokensSnapshot = { read: Token[]; unread: Token[] };

/** Refill a token list in place, since the reader's lists are readonly fields. */
function replaceTokens(target: Token[], source: Token[]) {
    target.length = 0;
    for (const token of source) target.push(token);
}
