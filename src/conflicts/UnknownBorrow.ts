import type Borrow from '@nodes/Borrow';
import type Translation from '@translation/Translation';
import Conflict from './Conflict';

export class UnknownBorrow extends Conflict {
    readonly borrow: Borrow;

    constructor(borrow: Borrow) {
        super(false);

        this.borrow = borrow;
    }

    getConflictingNodes() {
        return {
            primary: {
                node:
                    this.borrow.source === undefined
                        ? this.borrow.borrow
                        : this.borrow.source,
                explanation: (translation: Translation) =>
                    translation.conflict.UnknownBorrow.primary,
            },
        };
    }
}
