import Node from "./Node";
import type ColumnType from "./ColumnType";
import type Program from "./Program";
import type Conflict from "./Conflict";

export default class TableType extends Node {
    
    readonly columns: ColumnType[];

    constructor(columns: ColumnType[]) {
        super();

        this.columns = columns;
    }

    getChildren() { return [ ...this.columns ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}