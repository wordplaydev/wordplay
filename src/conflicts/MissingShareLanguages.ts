import type Share from "../nodes/Share";
import Conflict from "./Conflict";


export class MissingShareLanguages extends Conflict {
    readonly share: Share;
    constructor(share: Share) {
        super(false);
        this.share = share;
    }
}
