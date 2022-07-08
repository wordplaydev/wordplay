import Node from "./Node";
import type Column from "./Column";
import type Row from "./Row";

export default class Table extends Node {
    
    readonly columns: Column[];
    readonly rows: Row[];

    constructor(columns: Column[], rows: Row[]) {
        super();

        this.columns = columns;
        this.rows = rows;
    }

    getChildren() { return [ ...this.columns, ...this.rows ]; }

}