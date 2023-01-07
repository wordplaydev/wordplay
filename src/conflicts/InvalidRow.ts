import type Row from '../nodes/Row';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class InvalidRow extends Conflict {
    readonly row: Row;

    constructor(row: Row) {
        super(false);
        this.row = row;
    }

    getConflictingNodes() {
        return { primary: this.row };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.InvalidRow.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
