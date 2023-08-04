import type { BasisTypeName } from '../basis/BasisConstants';
import TableType from '@nodes/TableType';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type Exception from './Exception';
import type Value from './Value';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';
import Simple from './Simple';
import type Structure from './Structure';
import type Expression from '../nodes/Expression';

export default class Table extends Simple {
    readonly type: TableType;
    readonly rows: Structure[];

    constructor(creator: Expression, type: TableType, rows: Structure[]) {
        super(creator);

        this.type = type;
        this.rows = rows;
    }

    insert(requestor: Expression, row: Structure): Table | Exception {
        return new Table(requestor, this.type, [...this.rows, row]);
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

    getDescription(translation: Locale) {
        return concretize(translation, translation.term.table);
    }

    getSize() {
        let sum = 0;
        for (const row of this.rows) sum += row.getSize();
        return sum;
    }
}
