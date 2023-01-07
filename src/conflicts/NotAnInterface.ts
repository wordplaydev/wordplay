import Conflict from './Conflict';
import type Reference from '../nodes/Reference';
import type Definition from '../nodes/Definition';
import type Translation from '../translations/Translation';

export default class NotAnInterface extends Conflict {
    readonly def: Definition;
    readonly ref: Reference;

    constructor(def: Definition, ref: Reference) {
        super(false);
        this.def = def;
        this.ref = ref;
    }

    getConflictingNodes() {
        return { primary: this.ref, secondary: [this.def.names] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotAnInterface.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
