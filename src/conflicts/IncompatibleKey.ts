import type Context from "../nodes/Context";
import type SetOrMapAccess from "../nodes/SetOrMapAccess";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleKey extends Conflict {
    readonly access: SetOrMapAccess;
    readonly expected: Type;
    readonly received: Type;
    
    constructor(access: SetOrMapAccess, expected: Type, received: Type) {
        super(false);
        this.access = access;
        this.expected = expected;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: this.access.key, secondary: [ this.expected ] };
    }

    getPrimaryExplanation(context: Context): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `I expect keys of type ${this.expected.toWordplay()}, but this is ${this.received.getDescriptions(context).eng}`
        }
    }

}
