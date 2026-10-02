import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';
import type { ExceptionText } from '#locale/NodeTexts.ts';
import type Program from '#nodes/Program.ts';

export default class BlankException extends ExceptionValue {
    readonly program: Program;

    constructor(evaluator: Evaluator, program: Program) {
        super(program, evaluator);

        this.program = program;
    }

    getExceptionText(locales: Locales): ExceptionText {
        return locales.getTextStructure(
            (l) => l.node.Program.exception.BlankException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(this.getExceptionText(locales).explanation);
    }
}
