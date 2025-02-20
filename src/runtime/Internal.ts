import { UNKNOWN_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import AnyType from '../nodes/AnyType';
import type Expression from '../nodes/Expression';
import Markup from '../nodes/Markup';
import SimpleValue from '../values/SimpleValue';

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
        return new Markup([]);
    }

    getRepresentativeText() {
        return UNKNOWN_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
