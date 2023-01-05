import type BinaryOperation from '../nodes/BinaryOperation';
import type Translation from '../translations/Translation';
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
            primary: this.operation.operator,
            secondary: [this.after.operator],
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.OrderOfOperations.primary();
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.OrderOfOperations.secondary();
    }
}
