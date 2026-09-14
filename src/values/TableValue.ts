import type LocaleText from '@locale/LocaleText';
import getConceptName from '@locale/getConceptName';
import TableType from '@nodes/TableType';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type ExceptionValue from '@values/ExceptionValue';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import type Expression from '@nodes/Expression';
import SimpleValue from '@values/SimpleValue';

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
        row: StructureValue,
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
            this.rows.every((row, rowIndex) => {
                const other = table.rows[rowIndex];
                // The lengths match, so there is always a row to compare with.
                return other !== undefined && row.isEqualTo(other);
            })
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

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'table');
    }

    getRepresentativeText() {
        return TABLE_OPEN_SYMBOL + TABLE_CLOSE_SYMBOL;
    }

    getSize() {
        let sum = 0;
        for (const row of this.rows) sum += row.getSize();
        return sum;
    }

    isCollection() {
        return true;
    }

    /** A translate (↦) over a table binds `.` to each row Structure. */
    getTranslationItems(): Value[] {
        return this.rows;
    }

    /** Build a new table from the translated rows, deriving the table type from the revised row structure. */
    createTranslation(creator: Expression, results: Value[]): Value {
        const rows = results.filter(
            (row): row is StructureValue => row instanceof StructureValue,
        );
        const firstRow = rows[0];
        const type =
            firstRow === undefined
                ? this.type
                : TableType.make(firstRow.type.inputs);
        return new TableValue(creator, type, rows);
    }
}
