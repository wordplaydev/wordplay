import type Program from '#nodes/Program.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';

export default class ProjectSizeLimitException extends ExceptionValue {
    constructor(evaluator: Evaluator, program: Program) {
        super(program, evaluator);
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.output.Source.ProjectSizeLimitException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(this.getExceptionText(locales).explanation);
    }
}
