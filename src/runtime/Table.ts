import type { NativeTypeName } from '../native/NativeConstants';
import type LanguageCode from '@translation/LanguageCode';
import type TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type Exception from './Exception';
import Value from './Value';
import type Locale from '@translation/Locale';

export default class Table extends Value {
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

    getNativeTypeName(): NativeTypeName {
        return 'table';
    }

    resolve() {
        return undefined;
    }

    isEqualTo(structure: Value): boolean {
        structure;
        return false;
    }

    toWordplay(languages: LanguageCode[]): string {
        return `${this.literal.type.columns
            .map((c) => (c ? c.names.getLocaleText(languages) : ''))
            .join(TABLE_OPEN_SYMBOL)}${TABLE_CLOSE_SYMBOL}`;
    }

    getDescription(translation: Locale) {
        return translation.data.table;
    }

    getSize() {
        let sum = 0;
        for (const row of this.rows)
            for (const cell of row) sum += cell.getSize();
        return sum;
    }
}
