import type Reference from '../nodes/Reference';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class UnexpectedTypeVariable extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return { primary: this.name, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnexpectedTypeVariable.primary();
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
