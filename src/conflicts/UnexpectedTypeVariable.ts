import type Reference from '@nodes/Reference';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.UnexpectedTypeVariable),
            },
        };
    }
}
