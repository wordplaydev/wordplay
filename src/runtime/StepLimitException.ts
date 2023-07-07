import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Locale from '@locale/Locale';
import type Node from '@nodes/Node';
import concretize from '../locale/locales/concretize';

export default class StepLimitException extends Exception {
    readonly node: Node;
    constructor(evaluator: Evaluator, node: Node) {
        super(evaluator);
        this.node = node;
    }

    getDescription(locale: Locale) {
        return concretize(locale, locale.exceptions.steplimit);
    }
}
