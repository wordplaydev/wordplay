import type Cell from "../nodes/Cell";
import type TableType from "../nodes/TableType";
import Conflict from "./Conflict";


export class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Cell;
    
    constructor(type: TableType, cell: Cell) {
        super(false);
        this.type = type;
        this.cell = cell;
    }

    getConflictingNodes() {
        return { primary: [ this.cell ] };
    }

    getExplanations() { 
        return {
            eng: `This isn't one of the columns in this table type.`
        }
    }

}
