import NoneType from '@nodes/NoneType';
import { NONE_SYMBOL } from '@parser/Symbols';
import type Value from '../values/Value';
import type { BasisTypeName } from '../basis/BasisConstants';
import SimpleValue from './SimpleValue';
import type Locale from '@locale/Locale';
import type Expression from '../nodes/Expression';
import type Concretizer from '../nodes/Concretizer';

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

    getDescription(concretize: Concretizer, locale: Locale) {
        return concretize(locale, locale.term.none);
    }

    getSize() {
        return 1;
    }
}
