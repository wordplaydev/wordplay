import type LocaleText from '#locale/LocaleText.ts';
import { UNKNOWN_SYMBOL } from '#parser/Symbols.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import AnyType from '#nodes/AnyType.ts';
import type Expression from '#nodes/Expression.ts';
import SimpleValue from '#values/SimpleValue.ts';

export default class Internal<Kind> extends SimpleValue {
    readonly value: Kind;

    constructor(creator: Expression, initial: Kind) {
        super(creator);

        this.value = initial;
    }

    toWordplay() {
        return 'internal';
    }

    getType() {
        return new AnyType();
    }

    getBasisTypeName(): BasisTypeName {
        return 'internal';
    }

    isEqualTo() {
        return false;
    }

    getDescription() {
        return (l: LocaleText) => l.node.InternalExpression.name;
    }

    getRepresentativeText() {
        return UNKNOWN_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
