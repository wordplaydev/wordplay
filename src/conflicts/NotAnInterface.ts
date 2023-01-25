import Conflict from './Conflict';
import type Reference from '@nodes/Reference';
import type Definition from '@nodes/Definition';
import type Translation from '@translation/Translation';

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
                explanation: (translation: Translation) =>
                    translation.conflict.NotAnInterface.primary,
            },
        };
    }
}
