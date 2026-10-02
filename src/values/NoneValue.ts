import type LocaleText from '#locale/LocaleText.ts';
import getConceptName from '#locale/getConceptName.ts';
import NoneType from '#nodes/NoneType.ts';
import { NONE_SYMBOL } from '#parser/Symbols.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import type Expression from '#nodes/Expression.ts';
import type Value from '#values/Value.ts';
import SimpleValue from '#values/SimpleValue.ts';

export default class NoneValue extends SimpleValue {
    constructor(creator: Expression) {
        super(creator);
    }

    getType() {
        return NoneType.None;
    }

    getBasisTypeName(): BasisTypeName {
        return 'none';
    }

    isEqualTo(value: Value) {
        return value instanceof NoneValue;
    }

    toWordplay() {
        return NONE_SYMBOL;
    }

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'none');
    }

    getRepresentativeText() {
        return NONE_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
