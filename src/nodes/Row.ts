import Node from "./Node";
import type Cell from "./Cell";
import type Unparsable from "./Unparsable";
import type Token from "./Token";

export default class Row extends Node {

    readonly cells: Cell[];
    readonly close: Token | Unparsable;

    constructor(cells: Cell[], close: Token | Unparsable) {

        super();

        this.cells = cells;
        this.close = close;
        
    }

    computeChildren() {
        return [ ...this.cells, this.close ];
    }

}