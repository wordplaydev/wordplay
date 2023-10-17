import Conflict from './Conflict';
import type UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.UnparsableExpression.conflict
                                    .UnparsableConflict
                        ),
                        this.unparsable instanceof UnparsableExpression
                    ),
            },
        };
    }
}
