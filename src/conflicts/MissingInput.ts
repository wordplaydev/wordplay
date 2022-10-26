import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";
import type BinaryOperation from "../nodes/BinaryOperation";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"


export default class MissingInput extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly input: Bind;

    constructor(func: FunctionType | StructureType, evaluate: Evaluate | BinaryOperation, input: Bind) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.input = input;
    }

    getConflictingNodes() {
        return { primary: this.input.names.names };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Expected an input ${this.input.names.getTranslation("eng")}, but it wasn't provided.`
        }
    }

}
