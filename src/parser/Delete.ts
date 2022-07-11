import type { Token } from "./Token";
import Expression from "./Expression";
import type Program from "./Program";
import type Conflict from "./Conflict";
import type Type from "./Type";
import type Unparsable from "./Unparsable";

export default class Delete extends Expression {
    
    readonly table: Expression;
    readonly del: Token;
    readonly query: Expression | Unparsable;

    constructor(table: Expression, del: Token, query: Expression | Unparsable) {
        super();

        this.table = table;
        this.del = del;
        this.query = query;

    }

    getChildren() { return [ this.table, this.del, this.query ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        // The type is identical to the table's type.
        return this.table.getType(program);
    }

}