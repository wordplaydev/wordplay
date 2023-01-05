import Expression from '../nodes/Expression';
import type MapLiteral from '../nodes/MapLiteral';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class NotAMap extends Conflict {
    readonly map: MapLiteral;

    constructor(set: MapLiteral) {
        super(false);
        this.map = set;
    }

    getConflictingNodes() {
        return {
            primary: this.map.open,
            secondary: this.map.values.filter((n) => n instanceof Expression),
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotAMap.primary();
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.NotAMap.secondary();
    }
}
