import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';
import type Program from '@nodes/Program';

export default class DynamicEditLimitException extends ExceptionValue {
    constructor(evaluator: Evaluator, program: Program) {
        super(program, evaluator);
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.output.Source.DynamicEditLimitException);
    }

    getExplanation(locales: Locales) {
        return concretize(locales, this.getExceptionText(locales).explanation);
    }
}
