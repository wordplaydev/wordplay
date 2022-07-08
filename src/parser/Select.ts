import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";

export default class Select extends Expression {
    
    readonly table: Expression;
    readonly select: Token;
    readonly row: Row;
    readonly query: Expression;

    constructor(table: Expression, select: Token, row: Row, query: Expression) {
        super();

        this.table = table;
        this.select = select;
        this.row = row;
        this.query = query;

    }

    getChildren() { return [ this.table, this.select, this.row, this.query ]; }

}