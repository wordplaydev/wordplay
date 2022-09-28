import type Bind from "../nodes/Bind";
import type Share from "../nodes/Share";
import Conflict from "./Conflict";


export class DuplicateShare extends Conflict {
    readonly share: Share;
    readonly other: Share;
    constructor(share: Share, other: Share) {
        super(false);
        this.share = share;
        this.other = other;
    }

    getConflictingNodes() {
        return { primary: (this.share.bind as Bind).names, secondary: (this.other.bind as Bind).names };
    }

    getExplanations() { 
        return {
            eng: `This share has the same name as a share in another file.`
        }
    }

}