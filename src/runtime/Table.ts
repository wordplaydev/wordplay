import { TABLE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type TableLiteral from "../nodes/TableLiteral";
import TableType from "../nodes/TableType";
import type Exception from "./Exception";
import Value from "./Value";

export default class Table extends Value {

    readonly literal: TableLiteral;
    readonly rows: Value[][];

    constructor(literal: TableLiteral, rows: Value[][]) {
        super();

        this.literal = literal;
        this.rows = rows;
    }

    insert(row: Value[]): Table | Exception {

        return new Table(this.literal, [ ... this.rows, row ]);
        
    }

    getType() { return new TableType([]); }
    
    getNativeTypeName(): string { return TABLE_NATIVE_TYPE_NAME; }

    resolve() { return undefined; }

    toString(): string {
        return this.rows.map(r => r.map(c => `|${c.toString()}`).join("") + "||").join("\n");
    }

}