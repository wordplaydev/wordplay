import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";

export default class Select extends Expression {
    
    readonly table: Expression;
    readonly update: Token;
    readonly row: Row;
    readonly query: Expression;

    constructor(table: Expression, update: Token, row: Row, query: Expression) {
        super();

        this.table = table;
        this.update = update;
        this.row = row;
        this.query = query;

    }

    getChildren() { return [ this.table, this.update, this.row, this.query ]; }

}