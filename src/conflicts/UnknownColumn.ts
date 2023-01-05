import type Expression from '../nodes/Expression';
import type TableType from '../nodes/TableType';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Expression;

    constructor(type: TableType, cell: Expression) {
        super(false);
        this.type = type;
        this.cell = cell;
    }

    getConflictingNodes() {
        return { primary: this.cell, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnknownColumn.primary();
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
