import Token from './Token';
import TokenType from './TokenType';
import { QUESTION_SYMBOL } from '@parser/Symbols';
import NativeType from './NativeType';
import type TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';

export default class BooleanType extends NativeType {
    readonly type: Token;

    constructor(type: Token) {
        super();

        this.type = type;

        this.computeChildren();
    }

    static make() {
        return new BooleanType(
            new Token(QUESTION_SYMBOL, TokenType.BOOLEAN_TYPE)
        );
    }

    getGrammar() {
        return [{ name: 'type', types: [Token] }];
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

    getNodeTranslation(translation: Translation) {
        return translation.nodes.BooleanType;
    }
}
