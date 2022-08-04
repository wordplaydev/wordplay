import type Row from "../nodes/Row";
import Conflict from "./Conflict";


export class MissingCells extends Conflict {
    readonly row: Row;
    constructor(row: Row) {
        super(false);
        this.row = row;
    }
}
