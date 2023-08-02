import type { BasisTypeName } from '../basis/BasisConstants';
import type TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type Exception from './Exception';
import type Value from './Value';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';
import Simple from './Simple';
import type Structure from './Structure';

export default class Table extends Simple {
    readonly literal: TableLiteral;
    readonly rows: Structure[];

    constructor(creator: TableLiteral, rows: Structure[]) {
        super(creator);

        this.literal = creator;
        this.rows = rows;
    }

    insert(row: Structure): Table | Exception {
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
            this.rows.every((row, rowIndex) =>
                row.isEqualTo(table.rows[rowIndex])
            )
        );
    }

    toWordplay(locales: Locale[]): string {
        const columns = this.literal.type.columns;
        let text = '';
        for (const row of this.rows) {
            text += TABLE_OPEN_SYMBOL;
            for (const col of columns)
                text += ` ${row.resolve(col.names)?.toWordplay(locales)}`;
            text += ` ${TABLE_CLOSE_SYMBOL}\n`;
        }
        return text.trim();
    }

    getDescription(translation: Locale) {
        return concretize(translation, translation.term.table);
    }

    getSize() {
        let sum = 0;
        for (const row of this.rows) sum += row.getSize();
        return sum;
    }
}
