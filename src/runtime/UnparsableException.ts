import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Locale from '@locale/Locale';
import type Expression from '@nodes/Expression';
import NodeLink from '@locale/NodeLink';
import concretize from '../locale/locales/concretize';

export default class UnparsableException extends Exception {
    readonly unparsable: Expression;

    constructor(evaluator: Evaluator, unparsable: Expression) {
        super(evaluator);

        this.unparsable = unparsable;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.exception.unparsable,
            new NodeLink(
                this.unparsable,
                locale,
                this.getNodeContext(this.unparsable)
            )
        );
    }
}
