import type Column from "./Column";
import type Row from "./Row";
import type Program from "./Program";
import Conflict from "./Conflict";
import Expression from "./Expression";
import type Type from "./Type";
import TableType from "./TableType";
import UnknownType from "./UnknownType";
import ColumnType from "./ColumnType";
import { SemanticConflict } from "./SemanticConflict";
import Unparsable from "./Unparsable";
import Bind from "./Bind";

export default class Table extends Expression {
    
    readonly columns: Column[];
    readonly rows: Row[];

    constructor(columns: Column[], rows: Row[]) {
        super();

        this.columns = columns;
        this.rows = rows;
    }

    getChildren() { return [ ...this.columns, ...this.rows ]; }

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts = [];

        // Columns must all have types.
        if(!(this.columns.map(c => c.bind) as (Bind|Unparsable)[]).every(bind => bind instanceof Unparsable || !(bind.getType(program) instanceof UnknownType)))
            conflicts.push(new Conflict(this, SemanticConflict.COLUMNS_MUST_BE_TYPED))

        // All cells in all rows must match their types.
        this.rows.forEach(row => {
            if(row.cells.length !== this.columns.length)
                conflicts.push(new Conflict(row, SemanticConflict.INCONSISTENT_ROW_LENGTH));
            row.cells.forEach((cell, index) => {
                if(cell.expression instanceof Expression || cell.expression instanceof Bind) {
                    if(index <= this.columns.length) {
                       const columnBind = this.columns[index].bind;
                        if(columnBind instanceof Bind && !columnBind.getType(program).isCompatible(program, cell.expression.getType(program)))
                            conflicts.push(new Conflict(cell.expression, SemanticConflict.CELL_TYPE_MISMATCH));
                    }
                }
            });
        })

        return conflicts; 
    
    }

    getType(program: Program): Type {
        const columnTypes = this.columns.map(c => new ColumnType(c.bind));
        if(!columnTypes.every(c => !(c.bind instanceof UnknownType))) return new UnknownType(this);
        return new TableType(columnTypes);
    }

}