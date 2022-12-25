import type Bind from "../nodes/Bind";
import type Token from "../nodes/Token";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class MisplacedShare extends Conflict {
    readonly bind: Bind;
    readonly share: Token;
    constructor(bind: Bind, share: Token) {
        super(false);
        
        this.bind = bind;
        this.share = share;
    }

    getConflictingNodes() {
        return { primary: this.share, secondary: [] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Can only share things in the main block.`
        }
    }

}

