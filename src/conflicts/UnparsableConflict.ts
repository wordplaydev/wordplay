import Conflict from "./Conflict";
import type Unparsable from "../nodes/Unparsable";

export class UnparsableConflict extends Conflict {
    readonly unparsable: Unparsable;

    constructor(unparsable: Unparsable) {
        super(false);
        this.unparsable = unparsable;
    }

    getConflictingNodes() {
        return { primary: [ this.unparsable ] };
    }

    getExplanations() {
        return {
            eng: `I couldn't parse this.`
        };
    }

}
