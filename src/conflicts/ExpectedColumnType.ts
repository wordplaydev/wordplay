import type Column from "../nodes/Column";
import Conflict from "./Conflict";


export class ExpectedColumnType extends Conflict {
    readonly column: Column;

    constructor(column: Column) {
        super(false);
        this.column = column;
    }

    getConflictingNodes() {
        return { primary: [ this.column.bind ] };
    }

    getExplanations() { 
        return {
            eng: `Table columns have to have a type.`
        }
    }

}