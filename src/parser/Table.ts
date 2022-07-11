import type Column from "./Column";
import type Row from "./Row";
import type Program from "./Program";
import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Type from "./Type";
import TableType from "./TableType";
import UnknownType from "./UnknownType";
import ColumnType from "./ColumnType";

export default class Table extends Expression {
    
    readonly columns: Column[];
    readonly rows: Row[];

    constructor(columns: Column[], rows: Row[]) {
        super();

        this.columns = columns;
        this.rows = rows;
    }

    getChildren() { return [ ...this.columns, ...this.rows ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        const columnTypes = this.columns.map(c => new ColumnType(c.getType(program)));
        if(!columnTypes.every(c => !(c.type instanceof UnknownType))) return new UnknownType(this);
        return new TableType(columnTypes);
    }

}