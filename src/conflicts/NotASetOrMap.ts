import type SetOrMapAccess from "../nodes/SetOrMapAccess";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";

export class NotASetOrMap extends Conflict {

    readonly access: SetOrMapAccess;
    readonly received: Type;

    constructor(access: SetOrMapAccess, received: Type) {
        super(false);
    
        this.access = access;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: [ this.access.setOrMap ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This isn't a set or map, it's a ${this.received.toWordplay()}.`
        }
    }

}