import type { NativeTypeName } from '../native/NativeConstants';
import { NONE_SYMBOL } from '../parser/Symbols';
import type Translation from '../translations/Translation';
import NativeType from './NativeType';
import type { Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
import type TypeSet from './TypeSet';

export default class NoneType extends NativeType {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    static None = new NoneType(new Token(NONE_SYMBOL, TokenType.NONE));

    static make() {
        return new NoneType(new Token(NONE_SYMBOL, TokenType.NONE));
    }

    getGrammar() {
        return [{ name: 'none', types: [Token] }];
    }

    computeConflicts() {}

    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => type instanceof NoneType);
    }

    getNativeTypeName(): NativeTypeName {
        return 'none';
    }

    clone(replace?: Replacement) {
        return new NoneType(
            this.replaceChild('none', this.none, replace)
        ) as this;
    }

    getDescription(translation: Translation) {
        return translation.types.NoneType.description;
    }
}
