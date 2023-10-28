import Sym from '@nodes/Sym';
import Program from '@nodes/Program';
import Borrow from '@nodes/Borrow';
import { BlockKind } from '@nodes/Block';
import { toTokens } from './toTokens';
import type Tokens from './Tokens';
import { parseBlock, parseDocs, parseReference } from './parseExpression';

export function toProgram(code: string): Program {
    return parseProgram(toTokens(code));
}

export default function parseProgram(tokens: Tokens, doc = false): Program {
    // If a borrow is next or there's no whitespace, parse a docs.
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;

    const borrows = [];
    while (tokens.hasNext() && tokens.nextIs(Sym.Borrow))
        borrows.push(parseBorrow(tokens));

    const block = parseBlock(tokens, BlockKind.Root, doc);

    // If the next token is the end, we're done! Otherwise, read all of the remaining
    // tokens and bundle them into an unparsable.
    const end = tokens.nextIsEnd() ? tokens.read(Sym.End) : undefined;

    return new Program(docs, borrows, block, end);
}

export function parseBorrow(tokens: Tokens): Borrow {
    const borrow = tokens.read(Sym.Borrow);
    const source = tokens.nextIs(Sym.Name) ? parseReference(tokens) : undefined;
    const dot = tokens.readIf(Sym.Access);
    const name =
        dot && tokens.nextIs(Sym.Name) ? parseReference(tokens) : undefined;
    const version =
        tokens.nextIs(Sym.Number) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(Sym.Number)
            : undefined;

    return new Borrow(borrow, source, dot, name, version);
}
