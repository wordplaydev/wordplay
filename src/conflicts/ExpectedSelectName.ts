import type Expression from "../nodes/Expression";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export default class ExpectedSelectName extends Conflict {
    readonly cell: Expression;
    
    constructor(cell: Expression) {
        super(false);
    
        this.cell = cell;
    }

    getConflictingNodes() {
        return { primary: [ this.cell ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `This has to be a column name`,
            "😀": TRANSLATE
        }
    }

}
