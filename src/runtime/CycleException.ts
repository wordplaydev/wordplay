import type Borrow from '@nodes/Borrow';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import concretize from '../locale/concretize';

export default class CycleException extends Exception {
    readonly borrow: Borrow;

    constructor(evaluator: Evaluator, borrow: Borrow) {
        super(borrow, evaluator);

        this.borrow = borrow;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.node.Borrow.exception.CycleException,
            new NodeRef(
                this.borrow,
                locale,
                this.evaluator.project.getNodeContext(this.borrow),
                this.borrow.source?.getText()
            )
        );
    }
}
