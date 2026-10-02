import NodeRef from '#locale/NodeRef.ts';
import type Borrow from '#nodes/Borrow.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';

export default class CycleException extends ExceptionValue {
    readonly borrow: Borrow;

    constructor(evaluator: Evaluator, borrow: Borrow) {
        super(borrow, evaluator);

        this.borrow = borrow;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Borrow.exception.CycleException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) => l.node.Borrow.exception.CycleException.explanation,
            {
                borrow: new NodeRef(
                    this.borrow,
                    locales,
                    this.evaluator.project.getNodeContext(this.borrow),
                    this.borrow.source?.getName(),
                ),
            },
        );
    }
}
