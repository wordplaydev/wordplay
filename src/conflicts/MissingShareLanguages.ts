import type Share from "../nodes/Share";
import Conflict from "./Conflict";


export class MissingShareLanguages extends Conflict {
    readonly share: Share;

    constructor(share: Share) {
        super(false);
        this.share = share;
    }

    getConflictingNodes() {
        return [ this.share ];
    }

    getExplanations() { 
        return {
            eng: `To share something, you must tag it's names with languages.`
        }
    }

}
