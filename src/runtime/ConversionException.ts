import type Convert from '@nodes/Convert';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import concretize from '../locale/concretize';
import type Type from '../nodes/Type';
import ValueRef from '../locale/ValueRef';
import type Value from './Value';

export default class ConversionException extends Exception {
    readonly from: Value;
    readonly to: Type;

    constructor(evaluator: Evaluator, node: Convert, from: Value, to: Type) {
        super(node, evaluator);

        this.from = from;
        this.to = to;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.node.Convert.exception.ConversionException,
            // Wrap the node containing the name in a link
            new ValueRef(
                this.from,
                locale,
                this.evaluator.project.getNodeContext(this.creator)
            ),
            new NodeRef(
                this.to,
                locale,
                this.evaluator.project.getNodeContext(this.creator)
            )
        );
    }
}
