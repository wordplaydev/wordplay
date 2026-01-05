import { BlockKind } from '@nodes/Block';
import Borrow from '@nodes/Borrow';
import Program from '@nodes/Program';
import Sym from '@nodes/Sym';
import type Tokens from './Tokens';
import { parseBlock, parseReference } from './parseExpression';
import { toTokens } from './toTokens';

export function toProgram(code: string): Program {
    return parseProgram(toTokens(code));
}

export default function parseProgram(tokens: Tokens, doc = false): Program {
    const borrows: Borrow[] = [];
    tokens.whileDo(
        () => tokens.hasNext() && tokens.nextIs(Sym.Borrow),
        () => borrows.push(parseBorrow(tokens)),
    );

    const block = parseBlock(tokens, BlockKind.Root, doc);

    // If the next token is the end, we're done!
    const end = tokens.nextIsEnd() ? tokens.read(Sym.End) : undefined;

    return new Program(borrows, block, end);
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
