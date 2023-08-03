import type { BasisTypeName } from '../basis/BasisConstants';
import Simple from './Simple';
import type Value from './Value';
import type Expression from '../nodes/Expression';
import Markup from '../nodes/Markup';
import AnyType from '../nodes/AnyType';

export default class Internal<Kind> extends Simple {
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

    isEqualTo(val: Value) {
        return false;
    }

    getDescription() {
        return new Markup([]);
    }

    getSize() {
        return 1;
    }
}
