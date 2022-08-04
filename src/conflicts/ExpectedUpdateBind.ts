import type Cell from "../nodes/Cell";
import Conflict from "./Conflict";


export class ExpectedUpdateBind extends Conflict {
    readonly cell: Cell;
    constructor(cell: Cell) {
        super(false);
        this.cell = cell;
    }
}
