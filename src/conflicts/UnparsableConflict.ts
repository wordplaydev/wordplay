import Conflict from "./Conflict";
import type Unparsable from "../nodes/Unparsable";
import type Translations from "../nodes/Translations";

export class UnparsableConflict extends Conflict {
    readonly unparsable: Unparsable;

    constructor(unparsable: Unparsable) {
        super(false);
        this.unparsable = unparsable;
    }

    getConflictingNodes() {
        return { primary: [ this.unparsable ] };
    }

    getExplanations(): Translations {
        return {
            "😀": "TODO",
            eng: `I couldn't parse this.`
        };
    }

}
