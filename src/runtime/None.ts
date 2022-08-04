import type Alias from "../nodes/Alias";
import NoneType from "../nodes/NoneType";
import Value from "./Value";

export default class None extends Value {

    readonly aliases: Alias[];

    constructor(aliases: Alias[]) {
        super();
        this.aliases = aliases;
    }

    getType() { return new NoneType([]); }

    toString() { return `!${this.aliases.map(a => `${a.getName()}${a.lang === undefined ? "" : "/" + a.getLanguage()}`).join(";")}`; }

}