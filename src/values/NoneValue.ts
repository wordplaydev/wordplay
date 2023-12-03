import NoneType from '@nodes/NoneType';
import { NONE_SYMBOL } from '@parser/Symbols';
import type Value from '../values/Value';
import type { BasisTypeName } from '../basis/BasisConstants';
import SimpleValue from './SimpleValue';
import type Expression from '../nodes/Expression';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

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

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.none)
        );
    }

    getRepresentativeText() {
        return NONE_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
