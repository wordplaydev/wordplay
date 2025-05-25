import type LocaleText from '@locale/LocaleText';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class OrderOfOperations extends Conflict {
    readonly operation: BinaryEvaluate;
    readonly after: BinaryEvaluate;

    constructor(operation: BinaryEvaluate, after: BinaryEvaluate) {
        super(true);

        this.operation = operation;
        this.after = after;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.BinaryEvaluate.conflict.OrderOfOperations;

    getConflictingNodes() {
        return {
            primary: {
                node: this.operation,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => OrderOfOperations.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return OrderOfOperations.LocalePath;
    }
}
