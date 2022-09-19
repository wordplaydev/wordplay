import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";


export default class VariableLengthArgumentMustBeLast extends Conflict {

    readonly bind: Bind;

    constructor(rest: Bind) {
        super(false);

        this.bind = rest;
    }

    getConflictingNodes() {
        return { primary: [ this.bind ] };
    }

    getExplanations() { 
        return {
            eng: `Variable length inputs must be last.`
        }
    }

}
