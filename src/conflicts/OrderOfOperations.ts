import type BinaryOperation from '@nodes/BinaryOperation';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.OrderOfOperations),
            },
        };
    }
}
