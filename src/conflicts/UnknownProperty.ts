import type AccessName from "../nodes/AccessName";
import Conflict from "./Conflict";

export class UnknownProperty extends Conflict {
    readonly access: AccessName;
    constructor(access: AccessName) {
        super(false);
        this.access = access;
    }
}