import type Borrow from '@nodes/Borrow';
import NodeRef from '@locale/NodeRef';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class CycleException extends ExceptionValue {
    readonly borrow: Borrow;

    constructor(evaluator: Evaluator, borrow: Borrow) {
        super(borrow, evaluator);

        this.borrow = borrow;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Borrow.exception.CycleException);
    }

    getExplanation(locales: Locales) {
        return concretize(
            locales,
            this.getExceptionText(locales).explanation,
            new NodeRef(
                this.borrow,
                locales,
                this.evaluator.project.getNodeContext(this.borrow),
                this.borrow.source?.getName()
            )
        );
    }
}
