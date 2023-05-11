import type Locale from '@locale/Locale';
import type Program from '../nodes/Program';
import type Evaluator from './Evaluator';
import Exception from './Exception';

export default class BlankException extends Exception {
    readonly program: Program;

    constructor(evaluator: Evaluator, program: Program) {
        super(evaluator);

        this.program = program;
    }

    getDescription(translation: Locale) {
        return translation.exceptions.blank();
    }
}
