import type Row from '@nodes/Row';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.InvalidRow),
            },
        };
    }
}
