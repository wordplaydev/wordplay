import type { BasisTypeName } from '../basis/BasisConstants';
import TableType from '@nodes/TableType';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type ExceptionValue from '@values/ExceptionValue';
import type Value from '@values/Value';
import SimpleValue from './SimpleValue';
import type StructureValue from '@values/StructureValue';
import type Expression from '../nodes/Expression';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export default class TableValue extends SimpleValue {
    readonly type: TableType;
    readonly rows: StructureValue[];

    constructor(creator: Expression, type: TableType, rows: StructureValue[]) {
        super(creator);

        this.type = type;
        this.rows = rows;
    }

    insert(
        requestor: Expression,
        row: StructureValue
    ): TableValue | ExceptionValue {
        return new TableValue(requestor, this.type, [...this.rows, row]);
    }

    getType() {
        return TableType.make([]);
    }

    getBasisTypeName(): BasisTypeName {
        return 'table';
    }

    isEqualTo(table: Value): boolean {
        return (
            table instanceof TableValue &&
            this.rows.length === table.rows.length &&
            this.rows.every((row, rowIndex) =>
                row.isEqualTo(table.rows[rowIndex])
            )
        );
    }

    toWordplay(locales?: Locales): string {
        const columns = this.type.columns;
        let text = '';
        for (const row of this.rows) {
            text += TABLE_OPEN_SYMBOL;
            for (const col of columns)
                text += ` ${row.resolve(col.names)?.toWordplay(locales)}`;
            text += ` ${TABLE_CLOSE_SYMBOL}\n`;
        }
        return text.trim();
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.table)
        );
    }

    getRepresentativeText() {
        return TABLE_OPEN_SYMBOL + TABLE_CLOSE_SYMBOL;
    }

    getSize() {
        let sum = 0;
        for (const row of this.rows) sum += row.getSize();
        return sum;
    }
}
