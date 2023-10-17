import type Program from '../nodes/Program';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import concretize from '../locale/concretize';
import type { ExceptionText } from '../locale/NodeTexts';
import type Locales from '../locale/Locales';

export default class BlankException extends ExceptionValue {
    readonly program: Program;

    constructor(evaluator: Evaluator, program: Program) {
        super(program, evaluator);

        this.program = program;
    }

    getExceptionText(locales: Locales): ExceptionText {
        return locales.get((l) => l.node.Program.exception.BlankException);
    }

    getExplanation(locales: Locales) {
        return concretize(locales, this.getExceptionText(locales).explanation);
    }
}
