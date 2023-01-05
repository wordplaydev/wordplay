import type NameType from '../nodes/NameType';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class UnknownTypeName extends Conflict {
    readonly name: NameType;

    constructor(name: NameType) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return { primary: this.name, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnknownTypeName.primary();
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
