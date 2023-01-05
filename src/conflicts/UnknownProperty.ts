import type PropertyReference from '../nodes/PropertyReference';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class UnknownProperty extends Conflict {
    readonly access: PropertyReference;

    constructor(access: PropertyReference) {
        super(false);
        this.access = access;
    }

    getConflictingNodes() {
        return {
            primary: this.access.name ?? this.access.dot,
            secondary: [this.access.structure],
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnknownProperty.primary();
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
