import type Locale from '@locale/Locale';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Expression from '@nodes/Expression';
import NodeLink from '@locale/NodeLink';
import type Token from '@nodes/Token';
import concretize from '../locale/locales/concretize';

export default class UnimplementedException extends Exception {
    readonly placeholder: Expression | Token;
    constructor(evaluator: Evaluator, placeholder: Expression | Token) {
        super(evaluator);
        this.placeholder = placeholder;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.exceptions.placeholder,
            new NodeLink(
                this.placeholder,
                locale,
                this.getNodeContext(this.placeholder)
            )
        );
    }
}
