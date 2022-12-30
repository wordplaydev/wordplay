import type Borrow from '../nodes/Borrow';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
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

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `I don't know who this is, can't borrow!`,
        };
    }
}
