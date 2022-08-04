import type NameType from "../nodes/NameType";
import Conflict from "./Conflict";


export class UnknownTypeName extends Conflict {
    readonly name: NameType;
    constructor(name: NameType) {
        super(false);
        this.name = name;
    }
}
