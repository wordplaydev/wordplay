import Node from "./Node";
import type Cell from "./Cell";
import type Program from "./Program";
import type Conflict from "./Conflict";
import Name from "./Name";

export default class Row extends Node {

    readonly cells: Cell[];

    constructor(cells: Cell[]) {
        super();

        this.cells = cells;
    }

    getChildren() {
        return [ ...this.cells ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}