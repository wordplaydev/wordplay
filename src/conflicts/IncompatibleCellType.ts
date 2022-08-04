import type Cell from "../nodes/Cell";
import type TableType from "../nodes/TableType";
import Conflict from "./Conflict";


export class IncompatibleCellType extends Conflict {
    readonly type: TableType;
    readonly cell: Cell;
    constructor(type: TableType, cell: Cell) {
        super(false);
        this.type = type;
        this.cell = cell;
    }
}
