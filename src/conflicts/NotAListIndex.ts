import type ListAccess from "../nodes/ListAccess";
import Conflict from "./Conflict";


export class NotAListIndex extends Conflict {
    readonly access: ListAccess;
    constructor(access: ListAccess) {
        super(false);
        this.access = access;
    }
}
