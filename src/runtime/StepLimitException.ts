import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Translation from '../translations/Translation';
import type Node from '../nodes/Node';

export default class StepLimitException extends Exception {
    readonly node: Node;
    constructor(evaluator: Evaluator, node: Node) {
        super(evaluator);
        this.node = node;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.steplimit;
    }
}
