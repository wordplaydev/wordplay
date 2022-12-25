import type Evaluate from "../nodes/Evaluate";
import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Expression from "../nodes/Expression";
import type Bind from "../nodes/Bind";
import type Type from "../nodes/Type";
import type BinaryOperation from "../nodes/BinaryOperation";
import type StructureDefinition from "../nodes/StructureDefinition";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type Context from "../nodes/Context";

export default class IncompatibleInput extends Conflict {
    
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly givenNode: Expression | Bind;
    readonly givenType: Type;
    readonly expectedType: Type;
    
    constructor(func: FunctionDefinition | StructureDefinition, evaluate: Evaluate | BinaryOperation, givenInput: Expression | Bind, givenType: Type, expectedType: Type) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.givenNode = givenInput;
        this.givenType = givenType;
        this.expectedType = expectedType;
    }

    getConflictingNodes() {
        return { primary: this.givenNode, secondary: [ this.expectedType ] };
    }

    getPrimaryExplanation(context: Context): Translations {
        return {
            "😀": TRANSLATE,
            eng: `Expected input of type ${this.expectedType.toWordplay()}, received ${this.givenType.getDescriptions(context).eng}`
        }
    }

}