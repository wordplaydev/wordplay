import type Bind from '../nodes/Bind';
import BooleanType from '../nodes/BooleanType';
import ConversionType from '../nodes/ConversionType';
import FormattedType from '../nodes/FormattedType';
import FunctionType from '../nodes/FunctionType';
import ListType from '../nodes/ListType';
import MapType from '../nodes/MapType';
import NameType from '../nodes/NameType';
import NoneType from '../nodes/NoneType';
import NumberType from '../nodes/NumberType';
import SetType from '../nodes/SetType';
import StreamType from '../nodes/StreamType';
import Sym from '../nodes/Sym';
import TableType from '../nodes/TableType';
import TextType from '../nodes/TextType';
import type Type from '../nodes/Type';
import TypePlaceholder from '../nodes/TypePlaceholder';
import UnionType from '../nodes/UnionType';
import UnparsableType from '../nodes/UnparsableType';
import parseBind, { nextIsBind } from './parseBind';
import type Tokens from './Tokens';
import {
    parseTypeInputs,
    parseTypeVariables,
    parseUnit,
} from './parseExpression';
import parseLanguage from './parseLanguage';

export default function parseType(tokens: Tokens, isExpression = false): Type {
    let left: Type = tokens.nextIs(Sym.Placeholder)
        ? new TypePlaceholder(tokens.read(Sym.Placeholder))
        : tokens.nextIs(Sym.Name)
        ? parseNameType(tokens)
        : tokens.nextIs(Sym.BooleanType)
        ? new BooleanType(tokens.read(Sym.BooleanType))
        : tokens.nextIs(Sym.Operator, '%') ||
          tokens.nextIsOneOf(Sym.Number, Sym.NumberType)
        ? parseNumberType(tokens)
        : tokens.nextIs(Sym.Text)
        ? parseTextType(tokens)
        : tokens.nextIs(Sym.None)
        ? parseNoneType(tokens)
        : tokens.nextIs(Sym.ListOpen)
        ? parseListType(tokens)
        : tokens.nextIs(Sym.SetOpen)
        ? parseSetOrMapType(tokens)
        : tokens.nextIs(Sym.TableOpen)
        ? parseTableType(tokens)
        : tokens.nextIs(Sym.Function)
        ? parseFunctionType(tokens)
        : tokens.nextIs(Sym.Stream)
        ? parseStreamType(tokens)
        : // We use the doc symbol because it looks like an empty formatted
        tokens.nextIs(Sym.FormattedType)
        ? parseFormattedType(tokens)
        : new UnparsableType(tokens.readLine());

    if (!isExpression && tokens.nextIs(Sym.Convert))
        left = parseConversionType(left, tokens);

    while (tokens.nextIs(Sym.Union) && tokens.nextLacksPrecedingSpace()) {
        const or = tokens.read(Sym.Union);
        left = new UnionType(left, or, parseType(tokens));
    }

    return left;
}

function parseNameType(tokens: Tokens): NameType {
    const name = tokens.read(Sym.Name);
    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeInputs(tokens)
        : undefined;
    return new NameType(name, types);
}

/** TEXT_TYPE :: TEXT LANGUAGE? */
function parseTextType(tokens: Tokens): TextType {
    const open = tokens.read(Sym.Text);
    const words = tokens.nextIs(Sym.Words) ? tokens.read(Sym.Words) : undefined;
    const close = tokens.nextIs(Sym.Text) ? tokens.read(Sym.Text) : undefined;
    const format = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new TextType(open, words, close, format);
}

function parseNumberType(tokens: Tokens): NumberType {
    if (tokens.nextIs(Sym.Operator, '%'))
        return new NumberType(tokens.read(Sym.Operator));

    const number = tokens.nextIs(Sym.Number)
        ? tokens.read(Sym.Number)
        : tokens.read(Sym.NumberType);
    const unit =
        tokens.nextIsOneOf(Sym.Conditional, Sym.Name, Sym.Language) &&
        tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new NumberType(number, unit);
}

function parseNoneType(tokens: Tokens): NoneType {
    const none = tokens.read(Sym.None);
    return new NoneType(none);
}

function parseStreamType(tokens: Tokens): StreamType {
    const stream = tokens.read(Sym.Stream);
    const type = parseType(tokens);
    return new StreamType(stream, type);
}

function parseListType(tokens: Tokens): ListType {
    const open = tokens.read(Sym.ListOpen);
    const type = tokens.nextIsnt(Sym.ListClose) ? parseType(tokens) : undefined;
    const close = tokens.nextIs(Sym.ListClose)
        ? tokens.read(Sym.ListClose)
        : undefined;
    return new ListType(open, type, close);
}

function parseSetOrMapType(tokens: Tokens): SetType | MapType {
    const open = tokens.read(Sym.SetOpen);
    let key = undefined;
    let bind = undefined;
    let value = undefined;
    if (tokens.nextIsnt(Sym.SetClose)) {
        if (!tokens.nextIs(Sym.Bind)) key = parseType(tokens);
        bind = tokens.readIf(Sym.Bind);
        value =
            bind !== undefined && !tokens.nextIs(Sym.SetClose)
                ? parseType(tokens)
                : undefined;
    }
    const close = tokens.readIf(Sym.SetClose);
    return bind === undefined
        ? new SetType(open, key, close)
        : new MapType(open, key, bind, value, close);
}

export function parseTableType(tokens: Tokens): TableType {
    const open = tokens.read(Sym.TableOpen);

    const columns: Bind[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        !tokens.nextIs(Sym.TableClose)
    ) {
        const bind = nextIsBind(tokens, false) ? parseBind(tokens) : undefined;
        if (bind === undefined) break;
        else columns.push(bind);
    }
    const close = tokens.readIf(Sym.TableClose);
    return new TableType(open, columns, close);
}

function parseFunctionType(tokens: Tokens): FunctionType {
    const fun = tokens.read(Sym.Function);

    const typeVars = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.readIf(Sym.EvalOpen);

    // Don't allow reactions on types.
    tokens.pushReactionAllowed(false);

    const inputs: Bind[] = [];
    while (nextIsBind(tokens, false)) inputs.push(parseBind(tokens));

    // Restore previous allowed.
    tokens.popReactionAllowed();

    const close = tokens.readIf(Sym.EvalClose);

    const output = parseType(tokens);

    return new FunctionType(fun, typeVars, open, inputs, close, output);
}

function parseConversionType(left: Type, tokens: Tokens): ConversionType {
    const convert = tokens.read(Sym.Convert);
    const to = parseType(tokens);

    return new ConversionType(left, convert, to);
}

function parseFormattedType(tokens: Tokens): FormattedType {
    return new FormattedType(tokens.read(Sym.FormattedType));
}
