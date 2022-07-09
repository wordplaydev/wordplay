import type { Token } from "./Token";
import Expression from "./Expression";
import type Program from "./Program";
import type Conflict from "./Conflict";

export default class Delete extends Expression {
    
    readonly table: Expression;
    readonly del: Token;
    readonly query: Expression;

    constructor(table: Expression, del: Token, query: Expression) {
        super();

        this.table = table;
        this.del = del;
        this.query = query;

    }

    getChildren() { return [ this.table, this.del, this.query ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}