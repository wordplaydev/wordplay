import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type UnparsableType from "../nodes/UnparsableType";
import type UnparsableExpression from "../nodes/UnparsableExpression";

export class UnparsableConflict extends Conflict {
    readonly unparsable: UnparsableType | UnparsableExpression;

    constructor(unparsable: UnparsableType | UnparsableExpression) {
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
