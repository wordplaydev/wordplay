import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Locale from '@locale/Locale';
import type Expression from '@nodes/Expression';
import NodeRef from '@locale/NodeRef';
import concretize from '../locale/concretize';

export default class ValueException extends Exception {
    readonly expression: Expression;
    constructor(evaluator: Evaluator, expression: Expression) {
        super(expression, evaluator);
        this.expression = expression;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.node.Program.exception.ValueException,
            new NodeRef(
                this.expression,
                locale,
                this.getNodeContext(this.expression)
            )
        );
    }
}
