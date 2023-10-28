import Bind from '../nodes/Bind';
import Name from '../nodes/Name';
import Names from '../nodes/Names';
import Sym from '../nodes/Sym';
import { PairedCloseDelimiters } from './Tokenizer';
import type Tokens from './Tokens';
import parseType from './parseType';
import parseExpression, { parseDocs } from './parseExpression';
import parseLanguage from './parseLanguage';

export default function parseBind(tokens: Tokens): Bind {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const share = tokens.readIf(Sym.Share);
    const names = parseNames(tokens);
    const etc = tokens.readIf(Sym.Etc);
    let colon;
    let value;
    let dot;
    let type;

    if (tokens.nextIs(Sym.Type)) {
        dot = tokens.read(Sym.Type);
        type = parseType(tokens);
    }

    if (tokens.nextIs(Sym.Bind)) {
        colon = tokens.read(Sym.Bind);

        const next = tokens.peekText();
        // If there's a next token and it's not a close delimiter, parse a value.
        value =
            next && !PairedCloseDelimiters.has(next)
                ? parseExpression(tokens)
                : undefined;
    }

    return new Bind(docs, share, names, etc, dot, type, colon, value);
}

export function parseNames(tokens: Tokens): Names {
    const names: Name[] = [];

    while (
        (tokens.hasNext() &&
            names.length > 0 &&
            tokens.nextIs(Sym.Separator)) ||
        (names.length === 0 &&
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder, Sym.Operator))
    ) {
        const comma = tokens.nextIs(Sym.Separator)
            ? tokens.read(Sym.Separator)
            : undefined;
        if (names.length > 0 && comma === undefined) break;
        const name = tokens.nextIs(Sym.Name)
            ? tokens.read(Sym.Name)
            : tokens.nextIs(Sym.Placeholder)
            ? tokens.read(Sym.Placeholder)
            : tokens.nextIs(Sym.Operator)
            ? tokens.read(Sym.Operator)
            : undefined;
        const lang = tokens.nextIs(Sym.Language)
            ? parseLanguage(tokens)
            : undefined;
        if (comma !== undefined || name !== undefined)
            names.push(new Name(comma, name, lang));
        else break;
    }

    return new Names(names);
}

export function nextIsBind(tokens: Tokens, expectValue: boolean): boolean {
    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;
    const bind = parseBind(tokens);
    if (tokens.peek() === rollbackToken) return false;

    // Rollback
    tokens.unreadTo(rollbackToken);

    // It's a bind if it has a name and either doesn't expect a value, or has one, or has a name with a language tag
    return (
        bind.names.names.length > 0 &&
        (!expectValue || bind.colon !== undefined || bind.names.hasLanguage())
    );
}
