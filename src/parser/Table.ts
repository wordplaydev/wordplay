import Node from "./Node";
import type Column from "./Column";
import type Row from "./Row";
import type Program from "./Program";
import type Conflict from "./Conflict";

export default class Table extends Node {
    
    readonly columns: Column[];
    readonly rows: Row[];

    constructor(columns: Column[], rows: Row[]) {
        super();

        this.columns = columns;
        this.rows = rows;
    }

    getChildren() { return [ ...this.columns, ...this.rows ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}