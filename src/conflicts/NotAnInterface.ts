import Conflict from './Conflict';
import type Reference from '@nodes/Reference';
import type Definition from '@nodes/Definition';
import type Locale from '@locale/Locale';
import concretize from '../locale/locales/concretize';

export default class NotAnInterface extends Conflict {
    readonly def: Definition;
    readonly ref: Reference;

    constructor(def: Definition, ref: Reference) {
        super(false);
        this.def = def;
        this.ref = ref;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.ref,
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.NotAnInterface),
            },
        };
    }
}
