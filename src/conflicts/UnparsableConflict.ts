import Conflict from "./Conflict";
import type Unparsable from "../nodes/Unparsable";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type UnparsableType from "../nodes/UnparsableType";
import type UnparsableExpression from "../nodes/UnparsableExpression";

export class UnparsableConflict extends Conflict {
    readonly unparsable: Unparsable | UnparsableType | UnparsableExpression;

    constructor(unparsable: Unparsable | UnparsableType | UnparsableExpression) {
        super(false);
        this.unparsable = unparsable;
    }

    getConflictingNodes() {
        return { primary: [ this.unparsable ] };
    }

    getExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: `I couldn't parse this.`
        };
    }

}
