import type Row from "../nodes/Row";
import type TableType from "../nodes/TableType";
import Conflict from "./Conflict";


export class MissingCells extends Conflict {
    
    readonly type: TableType;
    readonly row: Row;
    constructor(type: TableType, row: Row) {
        super(false);

        this.type = type;
        this.row = row;
    }

    getConflictingNodes() {
        return { primary: [ this.row ] };
    }

    getExplanations() { 
        return {
            eng: `Missing cells in this row based on ${this.type.toWordplay()}`
        }
    }

}
