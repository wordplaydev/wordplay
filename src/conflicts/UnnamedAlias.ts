import type Alias from "../nodes/Alias";
import Conflict from "./Conflict";


export default class UnnamedAlias extends Conflict {
    readonly alias: Alias;
    constructor(alias: Alias) {
        super(false);
        this.alias = alias;
    }
}
