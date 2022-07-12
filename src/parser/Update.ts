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
import BooleanType from "./BooleanType";

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

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new Conflict(this, SemanticConflict.NOT_A_TABLE));

        this.row.cells.forEach(cell => {
            // The columns in an update must be binds with expressions.
            if(!(cell.expression instanceof Bind && cell.expression.value !== undefined && cell.expression.names.length === 1))
                conflicts.push(new Conflict(cell, SemanticConflict.EXPECTED_UPDATE_SINGLE_NAME_VALUED_BIND))
            else if(tableType instanceof TableType) {
                const columnType = tableType.getColumnNamed(cell.expression.names[0].name.text);
                // The named table column must exist.
                if(columnType === undefined)
                    conflicts.push(new Conflict(cell, SemanticConflict.UNKNOWN_TABLE_COLUMN));
                // The types of the bound values must match the column types.
                else if(columnType.type instanceof Type) {
                    if(!columnType.type.isCompatible(program, cell.expression.getType(program)))
                        conflicts.push(new Conflict(cell, SemanticConflict.TABLE_UPDATE_TYPE_MISMATCH));
                }
            }
        });

        // The query must be truthy.
        if(this.query instanceof Expression && !(this.query.getType(program) instanceof BooleanType))
            conflicts.push(new Conflict(this, SemanticConflict.TABLE_QUERY_MUST_BE_TRUTHY))

        return conflicts; 
    
    }

    getType(program: Program): Type {
        // The type of an update is the type of its table
        return this.table.getType(program);        
    }

}