import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Step from "./Step";
import type Value from "./Value";
import type Expression from "../nodes/Expression";

export default class KeepStream extends Step {

    constructor(node: Expression) {
        super(node);
    }
    
    evaluate(): Value | undefined {
        return undefined;
    }

    getExplanations(): Translations {
        return {
            eng: `Keeping the stream.`,
            "😀": `${TRANSLATE} ∆`
        }
    }

}