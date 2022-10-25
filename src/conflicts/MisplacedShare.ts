import type Share from "../nodes/Share";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class MisplacedShare extends Conflict {
    readonly share: Share;
    constructor(share: Share) {
        super(false);
        this.share = share;
    }

    getConflictingNodes() {
        return { primary: [ this.share.share ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Can only share things in the main block.`
        }
    }

}

