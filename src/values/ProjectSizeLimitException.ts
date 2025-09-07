import type Program from '@nodes/Program';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Locales from '../locale/Locales';

export default class ProjectSizeLimitException extends ExceptionValue {
    constructor(evaluator: Evaluator, program: Program) {
        super(program, evaluator);
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.output.Source.ProjectSizeLimitException);
    }

    getExplanation(locales: Locales) {
        return locales.concretize(this.getExceptionText(locales).explanation);
    }
}
