import type Exception from "./Exception";
import Value from "./Value";

export default class Table extends Value {

    readonly rows: Value[][];

    constructor(rows: Value[][]) {
        super();
        this.rows = rows;
    }

    insert(row: Value[]): Table | Exception {

        return new Table([ ... this.rows, row ]);
        
    }

    toString(): string {
        return this.rows.map(r => r.map(c => `|${c.toString()}`).join("")).join("\n");
    }

}