import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';
import type Program from '../nodes/Program';

export default class StepLimitException extends ExceptionValue {
    readonly program: Program;
    constructor(evaluator: Evaluator, program: Program) {
        super(program, evaluator);
        this.program = program;
    }

    getExceptionText(locale: Locale) {
        return locale.node.Program.exception.StepLimitException;
    }

    getExplanation(locale: Locale) {
        return concretize(locale, this.getExceptionText(locale).explanation);
    }
}
