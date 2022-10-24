import type Cell from "../nodes/Cell";
import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";


export default class ExpectedSelectName extends Conflict {
    readonly cell: Cell;
    
    constructor(cell: Cell) {
        super(false);
    
        this.cell = cell;
    }

    getConflictingNodes() {
        return { primary: [ this.cell ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `This has to be a column name`,
            "😀": "TODO"
        }
    }

}
