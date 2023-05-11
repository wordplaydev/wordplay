import type Row from '@nodes/Row';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

export default class InvalidRow extends Conflict {
    readonly row: Row;

    constructor(row: Row) {
        super(false);
        this.row = row;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.row,
                explanation: (translation: Locale) =>
                    translation.conflict.InvalidRow.primary,
            },
        };
    }
}
