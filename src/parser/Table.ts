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
import type Bind from "./Bind";

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

        return conflicts; 
    
    }

    getType(program: Program): Type {
        const columnTypes = this.columns.map(c => new ColumnType(c.getType(program)));
        if(!columnTypes.every(c => !(c.type instanceof UnknownType))) return new UnknownType(this);
        return new TableType(columnTypes);
    }

}