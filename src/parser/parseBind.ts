import Bind from '../nodes/Bind';
import Name from '../nodes/Name';
import Names from '../nodes/Names';
import Sym from '../nodes/Sym';
import { PairedCloseDelimiters } from './Tokenizer';
import type Tokens from './Tokens';
import parseExpression, { parseDocs } from './parseExpression';
import parseLanguage from './parseLanguage';
import parseType from './parseType';

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

    tokens.whileDo(
        () =>
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder, Sym.Operator) &&
            (names.length === 0 || names.at(-1)?.separator !== undefined),
        () => {
            names.push(parseName(tokens));
        },
    );

    return new Names(names);
}

export function parseName(tokens: Tokens): Name {
    const name = tokens.read();
    const lang = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    const comma = tokens.nextIs(Sym.Separator)
        ? tokens.read(Sym.Separator)
        : undefined;
    return new Name(name, lang, comma);
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
        (!expectValue ||
            bind.colon !== undefined ||
            bind.names.hasALanguageTag())
    );
}

export function nextIsInput(tokens: Tokens): boolean {
    return (
        tokens.nextIsOneOf(Sym.Name, Sym.Operator) &&
        tokens.afterNextIs(Sym.Bind)
    );
}
