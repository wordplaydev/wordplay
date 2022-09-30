import type Translations from "../nodes/Translations";
import type Evaluable from "./Evaluable";
import Step from "./Step";
import type Value from "./Value";

export default class KeepStream extends Step {

    constructor(node: Evaluable) {
        super(node);
    }
    
    evaluate(): Value | undefined {
        return undefined;
    }

    getExplanations(): Translations {
        return {
            "eng": `Keeping the stream.`
        }
    }

}