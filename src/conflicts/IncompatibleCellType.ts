import type Expression from '../nodes/Expression';
import type TableType from '../nodes/TableType';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class IncompatibleCellType extends Conflict {
    readonly type: TableType;
    readonly cell: Expression;
    readonly expected: Type;
    readonly received: Type;

    constructor(
        type: TableType,
        cell: Expression,
        expected: Type,
        received: Type
    ) {
        super(false);

        this.type = type;
        this.cell = cell;
        this.expected = expected;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: this.cell, secondary: [this.type] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleCellType.primary([
            this.expected,
            this.received,
        ]);
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleCellType.secondary();
    }
}
