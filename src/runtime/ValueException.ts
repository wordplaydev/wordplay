import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Translation from '../translations/Translation';
import type Expression from '../nodes/Node';
import NodeLink from '../translations/NodeLink';

export default class ValueException extends Exception {
    readonly expression: Expression;
    constructor(evaluator: Evaluator, expression: Expression) {
        super(evaluator);
        this.expression = expression;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.value(
            new NodeLink(
                this.expression,
                translation,
                this.getNodeContext(this.expression)
            )
        );
    }
}
