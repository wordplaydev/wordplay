import type Row from '@nodes/Row';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get((l) => l.node.Row.conflict.InvalidRow)
                    ),
            },
        };
    }
}
