import Token from './Token';
import Symbol from './Symbol';
import { QUESTION_SYMBOL } from '@parser/Symbols';
import NativeType from './NativeType';
import type TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';

export default class BooleanType extends NativeType {
    readonly type: Token;

    constructor(type: Token) {
        super();

        this.type = type;

        this.computeChildren();
    }

    static make() {
        return new BooleanType(new Token(QUESTION_SYMBOL, Symbol.BooleanType));
    }

    getGrammar(): Grammar {
        return [{ name: 'type', types: node(Symbol.BooleanType) }];
    }

    clone(replace?: Replacement) {
        return new BooleanType(
            this.replaceChild('type', this.type, replace)
        ) as this;
    }

    computeConflicts() {}

    acceptsAll(types: TypeSet) {
        return types.list().every((type) => type instanceof BooleanType);
    }

    getNativeTypeName(): NativeTypeName {
        return 'boolean';
    }

    getNodeLocale(translation: Locale) {
        return translation.node.BooleanType;
    }

    getGlyphs() {
        return Glyphs.BooleanType;
    }
}
