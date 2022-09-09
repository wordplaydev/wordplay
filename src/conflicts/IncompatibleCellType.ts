import type Cell from "../nodes/Cell";
import type TableType from "../nodes/TableType";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleCellType extends Conflict {
    readonly type: Type;
    readonly cell: Cell;
    constructor(type: Type, cell: Cell) {
        super(false);
        this.type = type;
        this.cell = cell;
    }
}
