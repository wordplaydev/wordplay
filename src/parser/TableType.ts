import Node from "./Node";
import type ColumnType from "./ColumnTYpe";

export default class TableType extends Node {
    
    readonly columns: ColumnType[];

    constructor(columns: ColumnType[]) {
        super();

        this.columns = columns;
    }

    getChildren() { return [ ...this.columns ]; }

}