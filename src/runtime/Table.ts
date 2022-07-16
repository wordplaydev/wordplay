import Value from "./Value";

export default class Table extends Value {

    readonly rows: Value[][];

    constructor(rows: Value[][]) {
        super();
        this.rows = rows;
    }

    toString(): string {
        return this.rows.map(r => r.map(c => `|${c.toString()}`).join("")).join("\n");
    }

}