import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Exception from "./Exception";
import type Evaluator from "./Evaluator";
import type Names from "../nodes/Names";

export default class NameException extends Exception {

    readonly name: string | Names;

    constructor(name: string | Names, evaluator: Evaluator) {
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