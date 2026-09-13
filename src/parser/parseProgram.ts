import { BlockKind } from '@nodes/Block';
import Borrow from '@nodes/Borrow';
import type Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import Program from '@nodes/Program';
import type Reference from '@nodes/Reference';
import type Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import type Tokens from '@parser/Tokens';
import { parseBlock, parseDocs, parseReference } from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';

export function toProgram(code: string): Program {
    return parseProgram(toTokens(code));
}

/**
 * How many of a source's leading doc groups are the program's own documentation.
 *
 * All of them, unless the last one *touches* what follows it, which it then documents,
 * like every other doc (#1374). A group is the program's when nothing adjacent can take
 * it: a blank line follows, a borrow follows (which carries no docs of its own), or the
 * source ends there. The unit is the group rather than the doc, since docs separated by
 * at most one newline are locale variants of one doc.
 */
function programDocGroups(tokens: Tokens): number {
    if (!tokens.nextIs(Sym.Doc)) return 0;
    // A snapshot rather than `unreadTo`, since parsing a doc can split a token.
    const snapshot = tokens.snapshot();
    let groups = 0;
    while (tokens.nextIs(Sym.Doc)) {
        parseDocs(tokens);
        groups++;
    }
    const adjacent =
        tokens.hasNext() &&
        !tokens.nextIs(Sym.Borrow) &&
        !tokens.nextHasMoreThanOneLineBreak();
    tokens.restore(snapshot);
    return adjacent ? groups - 1 : groups;
}

/** Read `count` doc groups as one `Docs`, which is what a source's own documentation is
 *  when its author wrote it as several paragraphs separated by blank lines. */
function parseDocGroups(tokens: Tokens, count: number): Docs {
    const docs: Doc[] = [];
    for (let index = 0; index < count && tokens.nextIs(Sym.Doc); index++)
        docs.push(...parseDocs(tokens).docs);
    return new Docs(docs);
}

export default function parseProgram(tokens: Tokens, doc = false): Program {
    const groups = doc ? 0 : programDocGroups(tokens);
    const docs = groups > 0 ? parseDocGroups(tokens, groups) : undefined;

    const borrows: Borrow[] = [];
    tokens.whileDo(
        () => tokens.hasNext() && tokens.nextIs(Sym.Borrow),
        () => borrows.push(parseBorrow(tokens)),
    );

    const block = parseBlock(tokens, BlockKind.Root, doc);

    // If the next token is the end, we're done!
    const end = tokens.nextIsEnd() ? tokens.read(Sym.End) : undefined;

    return new Program(docs, borrows, block, end);
}

export function parseBorrow(tokens: Tokens): Borrow {
    const borrow = tokens.read(Sym.Borrow);
    // A kit reference (`@amy/colors`) is one token, so it takes the source slot's place
    // rather than being parsed as a name plus a language tag — which is what `amy/colors`
    // would lex as, and why kit references are `@`-prefixed at all.
    let external = tokens.nextIs(Sym.External)
        ? tokens.read(Sym.External)
        : undefined;
    let source =
        external === undefined && tokens.nextIs(Sym.Name)
            ? parseReference(tokens)
            : undefined;
    // A name followed by `:` names the kit that follows rather than being the source
    // borrowed (#1373) — `↓ warm: @bo/colors 3`. Which it is can only be known once the
    // `:` is seen, so the name is read into `source` first and moved here.
    let alias: Reference | undefined = undefined;
    let bind: Token | undefined = undefined;
    if (source !== undefined && tokens.nextIs(Sym.Bind)) {
        alias = source;
        source = undefined;
        bind = tokens.read(Sym.Bind);
        if (tokens.nextIs(Sym.External)) external = tokens.read(Sym.External);
    }
    const dot = tokens.readIf(Sym.Access);
    const name =
        dot && tokens.nextIs(Sym.Name) ? parseReference(tokens) : undefined;
    const version =
        tokens.nextIs(Sym.Number) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(Sym.Number)
            : undefined;

    return new Borrow(
        borrow,
        source,
        dot,
        name,
        version,
        external,
        alias,
        bind,
    );
}
