import type Explanations from "../nodes/Explanations";
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

    getExplanations(): Explanations {
        return {
            "eng": `Keeping the stream.`
        }
    }

}