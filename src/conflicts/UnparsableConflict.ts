import Conflict from './Conflict';
import type UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

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
                explanation: (translation: Locale) =>
                    concretize(
                        translation,
                        translation.node.UnparsableExpression.conflict
                            .UnparsableConflict,
                        this.unparsable instanceof UnparsableExpression
                    ),
            },
        };
    }
}
