import type Borrow from '@nodes/Borrow';
import type Locale from '@locale/Locale';
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
                explanation: (translation: Locale) =>
                    translation.conflict.UnknownBorrow.primary,
            },
        };
    }
}
