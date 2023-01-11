import type { NativeTypeName } from '../native/NativeConstants';
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '../parser/Symbols';
import type Context from './Context';
import NativeType from './NativeType';
import Token from './Token';
import TokenType from './TokenType';
import Type from './Type';
import type TypeSet from './TypeSet';
import type { Replacement } from './Node';
import type Translation from '../translation/Translation';

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

    clone(replace?: Replacement) {
        return new ListType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('type', this.type, replace),
            this.replaceChild('close', this.close, replace)
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

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const listDef = context.native.getListDefinition();
        return listDef.types !== undefined &&
            listDef.types.hasVariableNamed(name)
            ? this.type
            : undefined;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.ListType;
    }
}
