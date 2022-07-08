import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";

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

}