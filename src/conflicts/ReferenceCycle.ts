import type Reference from '../nodes/Reference';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class ReferenceCycle extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(true);

        this.name = name;
    }

    getConflictingNodes() {
        return { primary: this.name, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.ReferenceCycle.primary(this.name);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
