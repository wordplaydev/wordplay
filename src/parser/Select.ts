import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import Conflict from "./Conflict";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";
import { SemanticConflict } from "./SemanticConflict";
import Name from "./Name";

export default class Select extends Expression {
    
    readonly table: Expression;
    readonly select: Token;
    readonly row: Row;
    readonly query: Expression | Unparsable;

    constructor(table: Expression, select: Token, row: Row, query: Expression | Unparsable) {
        super();

        this.table = table;
        this.select = select;
        this.row = row;
        this.query = query;

    }

    getChildren() { return [ this.table, this.select, this.row, this.query ]; }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        // The columns in a select must be names.
        this.row.cells.forEach(cell => {
            if(!(cell.expression instanceof Name))
                conflicts.push(new Conflict(cell, SemanticConflict.SELECT_COLUMNS_MUST_BE_NAMES))
        });

        return conflicts;
    
    }

    getType(program: Program): Type {
        // A table type based on the row
        return new UnknownType(this);
    }

}