import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import Conflict from "./Conflict";
import type Type from "./Type";
import TableType from "./TableType";
import { SemanticConflict } from "./SemanticConflict";

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

    getConflicts(program: Program): Conflict[] { 
     
        const conflicts = [];

        const tableType = this.table.getType(program);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new Conflict(this, SemanticConflict.NOT_A_TABLE));

        return conflicts; 
    
    }

    getType(program: Program): Type {
        // The type is identical to the table's type.
        return this.table.getType(program);
    }

}