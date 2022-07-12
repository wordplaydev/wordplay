import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import Conflict from "./Conflict";
import Type from "./Type";
import type Unparsable from "./Unparsable";
import Bind from "./Bind";
import { SemanticConflict } from "./SemanticConflict";
import TableType from "./TableType";

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

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(program);

        // The columns in an update must be binds with expressions.
        this.row.cells.forEach(cell => {
            if(!(cell.expression instanceof Bind && cell.expression.value !== undefined && cell.expression.names.length === 1))
                conflicts.push(new Conflict(cell, SemanticConflict.EXPECTED_UPDATE_SINGLE_NAME_VALUED_BIND))
            else if(tableType instanceof TableType) {
                const columnType = tableType.getColumnNamed(cell.expression.names[0].name.text);
                if(columnType === undefined)
                    conflicts.push(new Conflict(cell, SemanticConflict.UNKNOWN_TABLE_COLUMN));
                else if(columnType.type instanceof Type) {
                    if(!columnType.type.isCompatible(program, cell.expression.getType(program)))
                        conflicts.push(new Conflict(cell, SemanticConflict.TABLE_UPDATE_TYPE_MISMATCH));
                }
            }
        });

        return conflicts; 
    
    }

    getType(program: Program): Type {
        // The type of an update is the type of its table
        return this.table.getType(program);        
    }

}