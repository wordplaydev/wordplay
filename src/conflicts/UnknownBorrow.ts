import type Borrow from '../nodes/Borrow';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class UnknownBorrow extends Conflict {
    readonly borrow: Borrow;

    constructor(borrow: Borrow) {
        super(false);

        this.borrow = borrow;
    }

    getConflictingNodes() {
        return {
            primary:
                this.borrow.source === undefined
                    ? this.borrow.borrow
                    : this.borrow.source,
            secondary: [],
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnknownBorrow.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
