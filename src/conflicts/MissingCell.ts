import type Bind from '../nodes/Bind';
import type Row from '../nodes/Row';
import type TableType from '../nodes/TableType';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class MissingCell extends Conflict {
    readonly row: Row;
    readonly type: TableType;
    readonly column: Bind;

    constructor(row: Row, type: TableType, column: Bind) {
        super(false);

        this.row = row;
        this.type = type;
        this.column = column;
    }

    getConflictingNodes() {
        return { primary: this.row, secondary: [this.column] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.MissingCell.primary(this.column);
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.MissingCell.secondary();
    }
}
