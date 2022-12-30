import {
    LIST_TYPE_VAR_NAMES,
    type NativeTypeName,
} from '../native/NativeConstants';
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '../parser/Tokenizer';
import type Context from './Context';
import NativeType from './NativeType';
import type Node from './Node';
import Token from './Token';
import TokenType from './TokenType';
import Type from './Type';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import type TypeSet from './TypeSet';

export default class ListType extends NativeType {
    readonly open: Token;
    readonly type: Type | undefined;
    readonly close: Token | undefined;
    // In some cases we know the length of a list and the index in an accessor and can use this to narrow types.
    readonly length?: number;

    constructor(
        open: Token,
        type: Type | undefined,
        close: Token | undefined,
        length?: number
    ) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
        this.length = length;

        this.computeChildren();
    }

    static make(type?: Type, length?: number) {
        return new ListType(
            new Token(LIST_OPEN_SYMBOL, TokenType.LIST_OPEN),
            type,
            new Token(LIST_CLOSE_SYMBOL, TokenType.LIST_CLOSE),
            length
        );
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            { name: 'type', types: [Type, undefined] },
            { name: 'close', types: [Token, undefined] },
        ];
    }

    clone(original?: Node, replacement?: Node) {
        return new ListType(
            this.replaceChild('open', this.open, original, replacement),
            this.replaceChild('type', this.type, original, replacement),
            this.replaceChild('close', this.close, original, replacement)
        ) as this;
    }

    computeConflicts() {}

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every(
            (type) =>
                type instanceof ListType &&
                // If this list type has no type specified, any will do.
                (this.type === undefined ||
                    // If the given type has no type specified, any will do
                    type.type === undefined ||
                    this.type.accepts(type.type, context))
        );
    }

    getNativeTypeName(): NativeTypeName {
        return 'list';
    }

    resolveTypeVariable(name: string): Type | undefined {
        return Object.values(LIST_TYPE_VAR_NAMES).includes(name)
            ? this.type
            : undefined;
    }

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'A list type',
        };
    }
}
