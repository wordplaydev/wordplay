import type This from "../nodes/This";
import { THIS_SYMBOL } from "../parser/Tokenizer";
import Conflict from "./Conflict";


export class MisplacedThis extends Conflict {
    readonly dis: This;
    constructor(dis: This) {
        super(false);
        this.dis = dis;
    }

    getConflictingNodes() {
        return { primary: [ this.dis.dis ] };
    }

    getExplanations() { 
        return {
            eng: `Can only use ${THIS_SYMBOL} inside a structure definition or reaction.`
        }
    }

}

