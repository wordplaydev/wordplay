import { Sym, type SymType } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Spaces from '#parser/Spaces.ts';
import { TAB_WIDTH } from '#parser/Spaces.ts';
import type { Lexical } from '#parser/TokenList.ts';

/**
 * What a parse needs to know to keep one unbalanced delimiter from re-reading the
 * rest of a program. Both collections are empty for balanced code, which is what
 * keeps every well-formed program parsing exactly as it would without this.
 */
export type DelimiterRecovery = {
    /** Closing delimiters that close nothing; each is unparsable on its own. */
    readonly stray: ReadonlySet<Token>;
    /** For an opening delimiter that is never closed, the token its contents stop before. */
    readonly boundary: ReadonlyMap<Token, Token>;
    /** For an opening delimiter that is closed, the delimiter that closes it. */
    readonly partner: ReadonlyMap<Token, Token>;
    /**
     * Opening delimiters that are missing, by the token each belongs before. A close that
     * leads a line, with nothing to close, ends the lines above it that are indented past
     * it, so what it lacks goes before the first of them. Each is a token with no text.
     */
    readonly missing: ReadonlyMap<Token, readonly Token[]>;
};

const CloseByOpen = new Map<SymType, SymType>([
    [Sym.EvalOpen, Sym.EvalClose],
    [Sym.ListOpen, Sym.ListClose],
    [Sym.SetOpen, Sym.SetClose],
]);
const Closes = new Set<SymType>(CloseByOpen.values());
const OpenByClose = new Map<SymType, SymType>(
    [...CloseByOpen].map(([open, close]) => [close, open]),
);

/** The close a token opens for, if it is an opening delimiter. */
export function closeOpenedBy(token: Token): SymType | undefined {
    for (const type of token.getTypes()) {
        const close = CloseByOpen.get(type);
        if (close !== undefined) return close;
    }
    return undefined;
}

/** The kind of closing delimiter a token is, if it is one. */
export function closeKindOf(token: Token): SymType | undefined {
    return token.getTypes().find((type) => Closes.has(type));
}

type Open = {
    token: Token;
    close: SymType;
    /** The line the delimiter is on, and that line's indentation. */
    line: number;
    indent: number;
    /** Where this delimiter's contents end if it turns out to be unclosed. */
    candidate: Token | undefined;
    /** How deep the stack was when the candidate was found. */
    candidateDepth: number;
};

function indentOf(space: string): number {
    let width = 0;
    for (const character of space.substring(space.lastIndexOf('\n') + 1))
        width += character === '\t' ? TAB_WIDTH : 1;
    return width;
}

/**
 * Pair a token list's delimiters before parsing, and for the ones that don't pair,
 * guess from layout where the missing one belongs.
 *
 * Layout means nothing in the grammar, but it says what an author meant: contents are
 * indented past the line that opened them, so the first line that isn't is where an
 * unclosed delimiter's contents ended. It is consulted only for unbalanced code.
 */
export function analyzeDelimiters(
    tokens: readonly Token[],
    spaces: Spaces,
    lexical: Lexical,
): DelimiterRecovery {
    const stray = new Set<Token>();
    const boundary = new Map<Token, Token>();
    const partners = new Map<Token, Token>();
    const missing = new Map<Token, Token[]>();
    /** The first token of each line so far, and the line's indentation. */
    const lines: { first: Token; indent: number }[] = [];

    /** The delimiters open so far, outermost first. */
    const stack: Open[] = [];
    /** Where on the stack each enclosing code example or interpolation began. */
    const frames: number[] = [];
    /** The delimiters closed from the end of a later line, which is where a close that
     *  doesn't belong takes one that does: `ƒ up)()` inside a structure's block. */
    const trailing: { open: Open; close: Token }[] = [];

    let line = 0;
    let lineIndent = 0;
    let onlyClosesOnLine = true;

    // Where nothing in the layout says sooner, an unclosed delimiter's contents end at
    // whatever turned out not to be its close.
    const giveUpOn = (open: Open, at: Token | undefined = undefined) => {
        const end = open.candidate ?? at;
        if (end) boundary.set(open.token, end);
    };

    for (const index of lexical.strays) {
        const token = tokens[index];
        if (token) stray.add(token);
    }

    let previous: Token | undefined = undefined;
    /** The token after the name of a definition that begins the line and lacks its `(`. */
    let definition: Token | undefined = undefined;
    for (const [position, token] of tokens.entries()) {
        const space = spaces.getSpace(token);
        const startsLine = space.includes('\n') || position === 0;
        if (startsLine) {
            line++;
            lineIndent = indentOf(space);
            onlyClosesOnLine = true;
            lines.push({ first: token, indent: lineIndent });
            // Where the inputs of a definition that begins this line would begin: after
            // a `•` or `ƒ` and a name, if what follows isn't the `(` that opens them.
            const name = tokens[position + 1];
            const after = tokens[position + 2];
            definition =
                (token.isSymbol(Sym.Type) || token.isSymbol(Sym.Function)) &&
                name?.isSymbol(Sym.Name) &&
                after !== undefined &&
                !after.isSymbol(Sym.EvalOpen)
                    ? after
                    : undefined;
        }

        // Delimiters are only structure in code, not in text, markup, or a pattern,
        // and nothing opened in an example or interpolation can be closed outside of it.
        const context = lexical.contexts[position] ?? 0;
        const inCode = context >= 0;
        const depth = inCode ? context : -1 - context;
        while (frames.length > depth)
            for (const unclosed of stack.splice(frames.pop() ?? 0))
                giveUpOn(unclosed, previous);
        while (frames.length < depth) frames.push(stack.length);
        const base = frames.at(-1) ?? 0;
        previous = token;

        if (inCode) {
            const closing = closeKindOf(token);
            // A line indented no deeper than the one a delimiter opened on is where its
            // contents would end, unless a close shows up first.
            if (startsLine && closing === undefined)
                for (let index = stack.length - 1; index >= base; index--) {
                    const open = stack[index];
                    if (
                        open !== undefined &&
                        open.candidate === undefined &&
                        lineIndent <= open.indent
                    ) {
                        open.candidate = token;
                        open.candidateDepth = stack.length;
                    }
                }

            const opening = closeOpenedBy(token);
            if (opening !== undefined)
                stack.push({
                    token,
                    close: opening,
                    line,
                    indent: lineIndent,
                    candidate: undefined,
                    candidateDepth: 0,
                });
            else if (closing !== undefined) {
                // The nearest delimiter this could close.
                let match = -1;
                for (let index = stack.length - 1; index >= base; index--)
                    if (stack[index]?.close === closing) {
                        match = index;
                        break;
                    }
                // When closing it would leave others unclosed, layout says whether this
                // is its close or one whose own open is missing. Code is laid out with a
                // close either on the line of its open, or leading a later line at that
                // line's indentation. So a close trailing a later line is that line's own,
                // and so is one leading a line indented like a delimiter it would abandon.
                const partner = stack[match];
                const abandoned = stack.slice(match + 1);
                const closesAnotherLine =
                    partner !== undefined &&
                    abandoned.length > 0 &&
                    (onlyClosesOnLine
                        ? partner.indent !== lineIndent &&
                          abandoned.some((open) => open.indent === lineIndent)
                        : partner.line < line);
                // A close leading a line with nothing left to close, indented like a line
                // whose delimiter was closed from the end of a later line, is that
                // delimiter's own. The one that took its place is the one that closes nothing.
                const taken =
                    match < 0 && onlyClosesOnLine
                        ? trailing.findLastIndex(
                              (pair) =>
                                  pair.open.close === closing &&
                                  pair.open.indent === lineIndent,
                          )
                        : -1;
                const usurper = trailing[taken];
                // On a line that begins a definition with no `(`, the first `)` that
                // nothing on the line opened closes the definition's inputs, whatever
                // else is open around it, and the `(` it lacks belongs after the name.
                if (
                    definition !== undefined &&
                    closing === Sym.EvalClose &&
                    !missing.has(definition) &&
                    (partner === undefined || partner.line < line)
                ) {
                    const open = new Token('', Sym.EvalOpen);
                    missing.set(definition, [open]);
                    partners.set(open, token);
                } else if (usurper) {
                    stray.add(usurper.close);
                    partners.set(usurper.open.token, token);
                    trailing.splice(taken, 1);
                } else if (match < 0 || closesAnotherLine) {
                    // Leading a line under lines indented past it, it closes those,
                    // and what is missing is the delimiter that opens them.
                    let above = lines.length - 2;
                    while (
                        above >= 0 &&
                        (lines[above]?.indent ?? 0) > lineIndent
                    )
                        above--;
                    const first = lines[above + 1];
                    const opens = OpenByClose.get(closing);
                    if (
                        onlyClosesOnLine &&
                        first !== undefined &&
                        above + 1 < lines.length - 1 &&
                        opens !== undefined &&
                        // Nothing still open may have opened among those lines, or
                        // what this closes would begin outside of it and end inside.
                        stack.slice(base).every((open) => open.line < above + 2)
                    ) {
                        const open = new Token('', opens);
                        missing.set(first.first, [
                            ...(missing.get(first.first) ?? []),
                            open,
                        ]);
                        partners.set(open, token);
                    } else stray.add(token);
                } else {
                    for (const unclosed of stack.splice(match + 1))
                        giveUpOn(unclosed, token);
                    const open = stack.pop();
                    if (open) partners.set(open.token, token);
                    if (open && !onlyClosesOnLine && open.line < line)
                        trailing.push({ open, close: token });
                    // Anything found inside what just closed was never at the level
                    // of the delimiters still open.
                    for (const open of stack)
                        if (open.candidateDepth > stack.length)
                            open.candidate = undefined;
                }
            }
            if (closing === undefined) onlyClosesOnLine = false;
        }
    }

    for (const unclosed of stack) giveUpOn(unclosed);

    return { stray, boundary, partner: partners, missing };
}
