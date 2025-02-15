import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Locales from '../locale/Locales';
import type { ExceptionText } from '../locale/NodeTexts';
import type Program from '../nodes/Program';

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
        return locales.concretize(this.getExceptionText(locales).explanation);
    }
}
