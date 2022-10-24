import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";
import type Translations from "../nodes/Translations";


export default class VariableLengthArgumentMustBeLast extends Conflict {

    readonly bind: Bind;

    constructor(rest: Bind) {
        super(false);

        this.bind = rest;
    }

    getConflictingNodes() {
        return { primary: [ this.bind ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `Variable length inputs must be last.`
        }
    }

}
