import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"

export default class UnknownInput extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    readonly given: Bind;
    
    constructor(func: FunctionType | StructureType, evaluate: Evaluate, given: Bind) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.given = given;

    }

    getConflictingNodes() {
        return { primary: this.given.names.names };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This given input doesn't correspond to any of this function's inputs.`
        }
    }

}
