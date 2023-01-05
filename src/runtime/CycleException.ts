import type Borrow from '../nodes/Borrow';
import type Translation from '../translations/Translation';
import type Evaluator from './Evaluator';
import Exception from './Exception';

export default class CycleException extends Exception {
    readonly borrow: Borrow;

    constructor(evaluator: Evaluator, borrow: Borrow) {
        super(evaluator);

        this.borrow = borrow;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.cycle(this.borrow);
    }
}
