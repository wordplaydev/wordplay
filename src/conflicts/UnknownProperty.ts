import type PropertyReference from "../nodes/PropertyReference";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";

export class UnknownProperty extends Conflict {
    readonly access: PropertyReference;

    constructor(access: PropertyReference) {
        super(false);
        this.access = access;
    }

    getConflictingNodes() { 
        return { primary: this.access.name ?? this.access.dot, secondary: [ this.access.structure ] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `I don't know who I am!`
        }
    }

}