import type Evaluate from "../nodes/Evaluate";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type NameType from "../nodes/NameType";
import type StructureDefinition from "../nodes/StructureDefinition";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";

export default class InvalidTypeInput extends Conflict {

    readonly evaluate: NameType | Evaluate;
    readonly type: Type;
    readonly definition: StructureDefinition | FunctionDefinition;

    constructor(evaluate: NameType | Evaluate, type: Type, definition: StructureDefinition | FunctionDefinition) {
        super(false);
        this.evaluate = evaluate;
        this.type = type;
        this.definition = definition;
    }

    getConflictingNodes() {
        return { primary: [ this.type ], secondary: [ this.definition.names ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This definition doesn't accept this type input.`
        }
    }

}
