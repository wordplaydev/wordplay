import type Borrow from '@nodes/Borrow';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.Borrow.conflict.UnknownBorrow
                    ),
            },
        };
    }
}
