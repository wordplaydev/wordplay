import type Name from '../nodes/Name';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class Unnamed extends Conflict {
    readonly alias: Name;
    constructor(alias: Name) {
        super(true);
        this.alias = alias;
    }

    getConflictingNodes() {
        return { primary: this.alias };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.Unnamed.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
