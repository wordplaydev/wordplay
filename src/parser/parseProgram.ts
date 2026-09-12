import { BlockKind } from '@nodes/Block';
import Borrow from '@nodes/Borrow';
import Program from '@nodes/Program';
import { Sym } from '@nodes/Sym';
import type Tokens from '@parser/Tokens';
import { parseBlock, parseDocs, parseReference } from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';

export function toProgram(code: string): Program {
    return parseProgram(toTokens(code));
}

export default function parseProgram(tokens: Tokens, doc = false): Program {
    const docs = !doc && tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;

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
    const external = tokens.nextIs(Sym.External)
        ? tokens.read(Sym.External)
        : undefined;
    const source =
        external === undefined && tokens.nextIs(Sym.Name)
            ? parseReference(tokens)
            : undefined;
    const dot = tokens.readIf(Sym.Access);
    const name =
        dot && tokens.nextIs(Sym.Name) ? parseReference(tokens) : undefined;
    const version =
        tokens.nextIs(Sym.Number) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(Sym.Number)
            : undefined;

    return new Borrow(borrow, source, dot, name, version, external);
}
