import type LocaleText from '@locale/LocaleText';
import NoneType from '@nodes/NoneType';
import { NONE_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Expression from '../nodes/Expression';
import type Value from '../values/Value';
import SimpleValue from './SimpleValue';

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
        return (l: LocaleText) => l.term.none;
    }

    getRepresentativeText() {
        return NONE_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
