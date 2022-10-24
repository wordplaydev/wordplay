import type Borrow from "../nodes/Borrow";
import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";


export class UnknownBorrow extends Conflict {

    readonly borrow: Borrow;

    constructor(borrow: Borrow) {
        super(false);

        this.borrow = borrow;

    }

    getConflictingNodes() {
        return { primary: [ this.borrow.name === undefined ? this.borrow.borrow : this.borrow.name ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `I don't know who I am!`
        }
    }

}
