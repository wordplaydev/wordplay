import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Translation from '../translations/Translation';
import type Node from '../nodes/Node';

export default class NameException extends Exception {
    readonly name: Node;

    constructor(name: Node, evaluator: Evaluator) {
        super(evaluator);

        this.name = name;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.name(this.name);
    }
}
