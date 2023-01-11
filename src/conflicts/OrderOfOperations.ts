import type BinaryOperation from '../nodes/BinaryOperation';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

export default class OrderOfOperations extends Conflict {
    readonly operation: BinaryOperation;
    readonly after: BinaryOperation;

    constructor(operation: BinaryOperation, after: BinaryOperation) {
        super(true);

        this.operation = operation;
        this.after = after;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.operation.operator,
                explanation: (translation: Translation) =>
                    translation.conflict.OrderOfOperations.primary,
            },
        };
    }
}
