import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Reference from "../nodes/Reference";
import type Definition from "../nodes/Definition";
import StructureDefinition from "../nodes/StructureDefinition";

export default class NotAnInterface extends Conflict {
    readonly def: Definition;
    readonly ref: Reference;

    constructor(def: Definition, ref: Reference) {
        super(false);
        this.def = def;
        this.ref = ref;
    }

    getConflictingNodes() {
        return { primary: this.ref, secondary: [ this.def.names ] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Structures can only implement interfaces, and ${this.def.names.getTranslation("eng")} ${
                this.def instanceof StructureDefinition ? 
                    " isn't an interface because it implements functions and/or has inputs " : 
                    " isn't a structure."
            }`
        }
    }

}
