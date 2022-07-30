import { NoneStructureType } from "../native/NoneStructureType";
import type Alias from "../nodes/Alias";
import Value from "./Value";

export default class None extends Value {

    readonly aliases: Alias[];

    constructor(aliases: Alias[]) {
        super();
        this.aliases = aliases;
    }

    getType() { return NoneStructureType; }

    toString() { return `!${this.aliases.map(a => `${a.getName()}${a.lang === undefined ? "" : "/" + a.getLanguage()}`).join(";")}`; }

}