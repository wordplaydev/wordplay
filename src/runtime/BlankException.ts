import type Locale from '@locale/Locale';
import type Program from '../nodes/Program';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import concretize from '../locale/concretize';

export default class BlankException extends Exception {
    readonly program: Program;

    constructor(evaluator: Evaluator, program: Program) {
        super(evaluator);

        this.program = program;
    }

    getDescription(translation: Locale) {
        return concretize(translation, translation.exception.blank);
    }
}
