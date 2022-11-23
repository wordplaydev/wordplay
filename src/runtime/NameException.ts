import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Exception from "./Exception";
import type Evaluator from "./Evaluator";

export default class UnparsableException extends Exception {

    readonly name: string;

    constructor(name: string, evaluator: Evaluator) {
        super(evaluator);

        this.name = name;

    }

    getExplanations(): Translations {
        return {
            eng: `Couldn't find ${this.name}.`,
            "😀": `${TRANSLATE} ${this.name}🤷🏻‍♀️`
        }
    };

}