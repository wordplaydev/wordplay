import type Evaluate from "../nodes/Evaluate";
import Conflict from "./Conflict";
import type Node from "../nodes/Node";
import type Bind from "../nodes/Bind";
import type BinaryOperation from "../nodes/BinaryOperation";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type StructureDefinition from "../nodes/StructureDefinition";


export default class MissingInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly last: Node;
    readonly input: Bind;

    constructor(func: FunctionDefinition | StructureDefinition, evaluate: Evaluate | BinaryOperation, last: Node, expected: Bind) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.last = last;
        this.input = expected;
    }

    getConflictingNodes() {
        return { primary: this.last, secondary: [ this.input.names ] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Expected an input ${this.input.names.getTranslation("eng")}, but it wasn't provided.`
        }
    }

}
