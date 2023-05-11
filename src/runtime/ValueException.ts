import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Locale from '@locale/Locale';
import type Expression from '@nodes/Node';
import NodeLink from '@locale/NodeLink';

export default class ValueException extends Exception {
    readonly expression: Expression;
    constructor(evaluator: Evaluator, expression: Expression) {
        super(evaluator);
        this.expression = expression;
    }

    getDescription(translation: Locale) {
        return translation.exceptions.value(
            new NodeLink(
                this.expression,
                translation,
                this.getNodeContext(this.expression)
            )
        );
    }
}
