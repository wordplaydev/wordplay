import Node from "./Node";
import type Cell from "./Cell";

export default class Row extends Node {

    readonly cells: Cell[];

    constructor(cells: Cell[]) {
        super();

        this.cells = cells;
    }

    getChildren() {
        return [ ...this.cells ];
    }

}