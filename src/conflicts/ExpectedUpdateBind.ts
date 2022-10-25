import type Cell from "../nodes/Cell";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";

export default class ExpectedUpdateBind extends Conflict {

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
            eng: `This has to provide a value, can't update without one!`,
            "😀": TRANSLATE
        }
    }

}
