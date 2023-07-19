import type { NativeTypeName } from '../native/NativeConstants';
import { NONE_SYMBOL } from '@parser/Symbols';
import type Locale from '@locale/Locale';
import NativeType from './NativeType';
import { node, type Grammar, type Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
import type TypeSet from './TypeSet';
import Glyphs from '../lore/Glyphs';

export default class NoneType extends NativeType {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    static None = new NoneType(new Token(NONE_SYMBOL, TokenType.None));

    static make() {
        return new NoneType(new Token(NONE_SYMBOL, TokenType.None));
    }

    getGrammar(): Grammar {
        return [{ name: 'none', types: node(TokenType.None) }];
    }

    computeConflicts() {}

    clone(replace?: Replacement) {
        return new NoneType(
            this.replaceChild('none', this.none, replace)
        ) as this;
    }

    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => type instanceof NoneType);
    }

    getNativeTypeName(): NativeTypeName {
        return 'none';
    }

    getNodeLocale(translation: Locale) {
        return translation.node.NoneType;
    }

    getGlyphs() {
        return Glyphs.None;
    }
}
