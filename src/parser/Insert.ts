import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import type Conflict from "./Conflict";
import type Type from "./Type";

export default class Insert extends Expression {
    
    readonly table: Expression;
    readonly insert: Token;
    readonly row: Row;

    constructor(table: Expression, insert: Token, row: Row) {
        super();

        this.table = table;
        this.insert = insert;
        this.row = row;

    }

    getChildren() { return [ this.table, this.insert, this.row ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        // The type is identical to the table's type.
        return this.table.getType(program);
    }

}