import { NoneStructureType } from "../native/NoneStructureType";
import Value from "./Value";

export default class None extends Value {

    readonly name: string | undefined;

    constructor(name?: string) {
        super();
        this.name = name;
    }

    getType() { return NoneStructureType; }

    toString() { return `!${this.name === undefined ? "" : this.name}`; }

}