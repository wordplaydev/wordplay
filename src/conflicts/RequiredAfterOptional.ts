import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";


export default class RequiredAfterOptional extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(false);
        
        this.bind = bind;
    }

    getConflictingNodes() {
        return [ this.bind ]
    }

    getExplanations() { 
        return {
            eng: `Required inputs can't come after optional ones.`
        }
    }

}
