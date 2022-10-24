import type StructureType from "../nodes/StructureType";
import type Evaluate from "../nodes/Evaluate";
import type FunctionType from "../nodes/FunctionType";
import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import type Expression from "../nodes/Expression";
import type Bind from "../nodes/Bind";
import type Type from "../nodes/Type";
import type BinaryOperation from "../nodes/BinaryOperation";

export default class IncompatibleInput extends Conflict {
    
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly givenNode: Expression | Bind;
    readonly givenType: Type;
    readonly expectedType: Type;
    
    constructor(func: FunctionType | StructureType, evaluate: Evaluate | BinaryOperation, givenInput: Expression | Bind, givenType: Type, expectedType: Type) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.givenNode = givenInput;
        this.givenType = givenType;
        this.expectedType = expectedType;
    }

    getConflictingNodes() {
        return { primary: [ this.givenNode ], secondary: [ this.expectedType ] };
    }

    getExplanations(): Translations {
        return {
            "😀": "TODO",
            eng: `Expected input of type ${this.expectedType.toWordplay()}, received ${this.givenType.toWordplay()}`
        }
    }

}