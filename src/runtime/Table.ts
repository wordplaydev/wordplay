import type { BasisTypeName } from '../basis/BasisConstants';
import type TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type Exception from './Exception';
import type Value from './Value';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';
import Simple from './Simple';

export default class Table extends Simple {
    readonly literal: TableLiteral;
    readonly rows: Value[][];

    constructor(creator: TableLiteral, rows: Value[][]) {
        super(creator);

        this.literal = creator;
        this.rows = rows;
    }

    insert(row: Value[]): Table | Exception {
        return new Table(this.literal, [...this.rows, row]);
    }

    getType() {
        return TableType.make([]);
    }

    getBasisTypeName(): BasisTypeName {
        return 'table';
    }

    isEqualTo(table: Value): boolean {
        return (
            table instanceof Table &&
            this.rows.length === table.rows.length &&
            this.rows.every(
                (row, rowIndex) =>
                    row.length === table.rows[rowIndex].length &&
                    row.every((cell, columnIndex) =>
                        cell.isEqualTo(table.rows[rowIndex][columnIndex])
                    )
            )
        );
    }

    toWordplay(locales: Locale[]): string {
        return `${this.literal.type.columns
            .map((c) => (c ? c.names.getPreferredNameString(locales) : ''))
            .join(TABLE_OPEN_SYMBOL)}${TABLE_CLOSE_SYMBOL}`;
    }

    getDescription(translation: Locale) {
        return concretize(translation, translation.term.table);
    }

    getSize() {
        let sum = 0;
        for (const row of this.rows)
            for (const cell of row) sum += cell.getSize();
        return sum;
    }
}
