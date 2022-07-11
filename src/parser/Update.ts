import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import type Conflict from "./Conflict";
import type Type from "./Type";
import type Unparsable from "./Unparsable";

export default class Update extends Expression {
    
    readonly table: Expression;
    readonly update: Token;
    readonly row: Row;
    readonly query: Expression | Unparsable;

    constructor(table: Expression, update: Token, row: Row, query: Expression | Unparsable) {
        super();

        this.table = table;
        this.update = update;
        this.row = row;
        this.query = query;

    }

    getChildren() { return [ this.table, this.update, this.row, this.query ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        // The type of an update is the type of its table
        return this.table.getType(program);        
    }

}