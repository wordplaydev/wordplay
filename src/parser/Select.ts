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
import TableType from "./TableType";

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

        // The columns named must be names in the table's type.
        const tableType = this.table.getType(program);
        if(tableType instanceof TableType) {
            this.row.cells.forEach((cell, index) => {
                const cellName = cell.expression instanceof Name ? cell.expression : undefined; 
                if(!(cellName !== undefined && 
                    index < tableType.columns.length && 
                    tableType.columns.find(c => c.names?.find(n => n.name.text === cellName.name.text) !== undefined) !== undefined
                    )
                  )
                    conflicts.push(new Conflict(cell, SemanticConflict.UNKNOWN_TABLE_COLUMN))
            });
    

            
        }

        return conflicts;
    
    }

    getType(program: Program): Type {
        // A table type based on the row
        return new UnknownType(this);
    }

}