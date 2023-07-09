import Conflict from './Conflict';
import type Type from '@nodes/Type';
import type Is from '@nodes/Is';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

export class ImpossibleType extends Conflict {
    readonly is: Is;
    readonly givenType: Type;

    constructor(is: Is, givenType: Type) {
        super(false);
        this.is = is;
        this.givenType = givenType;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.is.expression,
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.ImpossibleType),
            },
        };
    }
}
