import type Cell from "../nodes/Cell";
import type TableType from "../nodes/TableType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export default class UnknownColumn extends Conflict {
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

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This isn't one of the columns in this table type.`
        }
    }

}
