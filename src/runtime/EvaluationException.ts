import type Translations from '../nodes/Translations';
import Exception from './Exception';
import type Evaluator from './Evaluator';

export enum StackSize {
    EMPTY,
    FULL,
    LONG,
}

export default class EvaluationException extends Exception {
    readonly reason: StackSize;

    constructor(reason: StackSize, evaluator: Evaluator) {
        super(evaluator);

        this.reason = reason;
    }

    getExplanations(): Translations {
        return this.reason === StackSize.EMPTY
            ? {
                  eng: `Not evaluating any functions.`,
                  '😀': `🫙`,
              }
            : this.reason === StackSize.LONG
            ? {
                  eng: `Too many steps, we got tired!`,
                  '😀': `🫙`,
              }
            : {
                  eng: `This function seems to be evaluating itself indefinitely, so we stopped.`,
                  '😀': `🫗`,
              };
    }
}
