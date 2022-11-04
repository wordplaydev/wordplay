import type Evaluate from "../nodes/Evaluate";
import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";
import type BinaryOperation from "../nodes/BinaryOperation";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type StructureDefinition from "../nodes/StructureDefinition";


export default class MissingInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly input: Bind;

    constructor(func: FunctionDefinition | StructureDefinition, evaluate: Evaluate | BinaryOperation, input: Bind) {
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
