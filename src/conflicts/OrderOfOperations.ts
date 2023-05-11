import type BinaryOperation from '@nodes/BinaryOperation';
import type Locale from '@locale/Locale';
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
                explanation: (translation: Locale) =>
                    translation.conflict.OrderOfOperations.primary,
            },
        };
    }
}
