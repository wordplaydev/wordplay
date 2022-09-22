import type Row from "../nodes/Row";
import Conflict from "./Conflict";

export default class InvalidRow extends Conflict {
    readonly row: Row;
    
    constructor(row: Row) {
        super(false);
        this.row = row;
    }

    getConflictingNodes() {
        return { primary: [ this.row ] };
    }

    getExplanations() { 
        return {
            eng: `Inserted rows have to either include every column or every cell has to be named.`
        }
    }

}