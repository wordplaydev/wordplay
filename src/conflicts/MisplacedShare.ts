import type Share from "../nodes/Share";
import Conflict from "./Conflict";


export class MisplacedShare extends Conflict {
    readonly share: Share;
    constructor(share: Share) {
        super(false);
        this.share = share;
    }

    getConflictingNodes() {
        return { primary: [ this.share.share ] };
    }

    getExplanations() { 
        return {
            eng: `Can only share things in the main block.`
        }
    }

}

