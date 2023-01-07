import Conflict from './Conflict';
import type UnparsableType from '../nodes/UnparsableType';
import UnparsableExpression from '../nodes/UnparsableExpression';
import type Translation from '../translations/Translation';

export class UnparsableConflict extends Conflict {
    readonly unparsable: UnparsableType | UnparsableExpression;

    constructor(unparsable: UnparsableType | UnparsableExpression) {
        super(false);
        this.unparsable = unparsable;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.unparsable,
                explanation: (translation: Translation) =>
                    translation.conflict.UnparsableConflict.primary(
                        this.unparsable instanceof UnparsableExpression
                    ),
            },
        };
    }
}
