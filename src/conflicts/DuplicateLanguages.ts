import type Docs from "../nodes/Docs";
import Conflict from "./Conflict";


export class DuplicateLanguages extends Conflict {
    readonly docs: Docs[];
    constructor(docs: Docs[]) {
        super(false);
        this.docs = docs;
    }
}
