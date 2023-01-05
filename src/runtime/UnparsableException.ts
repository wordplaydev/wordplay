import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Node from '../nodes/Node';
import type Translation from '../translations/Translation';

export default class UnparsableException extends Exception {
    readonly unparsable: Node;

    constructor(evaluator: Evaluator, unparsable: Node) {
        super(evaluator);

        this.unparsable = unparsable;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.unparsable(this.unparsable);
    }
}
