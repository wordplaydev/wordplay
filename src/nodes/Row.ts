import Node, { type ConflictContext } from "./Node";
import type Cell from "./Cell";
import type Conflict from "../conflicts/Conflict";

export default class Row extends Node {

    readonly cells: Cell[];

    constructor(cells: Cell[]) {

        super();

        this.cells = cells;
        
    }

    getChildren() {
        return [ ...this.cells ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

}