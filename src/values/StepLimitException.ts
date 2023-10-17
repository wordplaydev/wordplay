import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import concretize from '../locale/concretize';
import type Program from '../nodes/Program';
import type Locales from '../locale/Locales';

export default class StepLimitException extends ExceptionValue {
    readonly program: Program;
    constructor(evaluator: Evaluator, program: Program) {
        super(program, evaluator);
        this.program = program;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Program.exception.StepLimitException);
    }

    getExplanation(locales: Locales) {
        return concretize(locales, this.getExceptionText(locales).explanation);
    }
}
