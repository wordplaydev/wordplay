import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export default class OrderOfOperations extends Conflict {
    readonly operation: BinaryEvaluate;
    readonly after: BinaryEvaluate;

    constructor(operation: BinaryEvaluate, after: BinaryEvaluate) {
        super(true);

        this.operation = operation;
        this.after = after;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.operation,
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.BinaryEvaluate.conflict.OrderOfOperations
                    ),
            },
        };
    }
}
