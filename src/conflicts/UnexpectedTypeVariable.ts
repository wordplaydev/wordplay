import type Reference from '@nodes/Reference';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

export class UnexpectedTypeVariable extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (translation: Locale) =>
                    translation.conflict.UnexpectedTypeVariable.primary,
            },
        };
    }
}
