import type Borrow from '@nodes/Borrow';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import concretize from '../locale/locales/concretize';

export default class CycleException extends Exception {
    readonly borrow: Borrow;

    constructor(evaluator: Evaluator, borrow: Borrow) {
        super(evaluator);

        this.borrow = borrow;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.exception.cycle,
            new NodeLink(
                this.borrow,
                locale,
                this.evaluator.project.getNodeContext(this.borrow),
                this.borrow.source?.getText()
            )
        );
    }
}
