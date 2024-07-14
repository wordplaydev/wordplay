import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import Conflict from './Conflict';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.BinaryEvaluate.conflict.OrderOfOperations,
                    ),
            },
        };
    }
}
