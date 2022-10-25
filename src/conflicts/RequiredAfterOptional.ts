import Conflict from "./Conflict";
import type Bind from "../nodes/Bind";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"


export default class RequiredAfterOptional extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(false);
        
        this.bind = bind;
    }

    getConflictingNodes() {
        return { primary: [ this.bind ] }
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Required inputs can't come after optional ones.`
        }
    }

}
