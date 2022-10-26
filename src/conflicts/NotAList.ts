import type ListAccess from "../nodes/ListAccess";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class NotAList extends Conflict {
    readonly access: ListAccess;
    readonly received: Type;

    constructor(access: ListAccess, received: Type) {
        super(false);
    
        this.access = access;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: [ this.access.list ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This isn't a list, it's a ${this.received.toWordplay()}.`
        }
    }

}