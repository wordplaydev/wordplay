import type Translation from '../translations/Translation';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Node from '../nodes/Node';

export default class UnimplementedException extends Exception {
    readonly placeholder: Node;
    constructor(evaluator: Evaluator, placeholder: Node) {
        super(evaluator);
        this.placeholder = placeholder;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.placeholder(this.placeholder);
    }
}
