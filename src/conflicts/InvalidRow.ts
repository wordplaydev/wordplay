import type Row from '@nodes/Row';
import type Locales from '../locale/Locales';
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
                explanation: (locales: Locales) =>
                    locales.concretize((l) => l.node.Row.conflict.InvalidRow),
            },
        };
    }
}
