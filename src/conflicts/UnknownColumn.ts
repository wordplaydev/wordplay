import type Expression from "../nodes/Expression";
import type TableType from "../nodes/TableType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export default class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Expression;
    
    constructor(type: TableType, cell: Expression) {
        super(false);
        this.type = type;
        this.cell = cell;
    }

    getConflictingNodes() {
        return { primary: this.cell, secondary: [] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This isn't one of the columns in this table type.`
        }
    }

}
