import Node from "./Node";
import type { Token } from "./Token";
import type Program from "./Program";
import type Conflict from "./Conflict";

export default class Alias extends Node {
    
    readonly alias?: Token;
    readonly name: Token;
    readonly slash?: Token;
    readonly lang?: Token;

    constructor(name: Token, alias?: Token, slash?: Token, lang?: Token) {
        super();

        this.alias = alias;
        this.name = name;
        this.slash = slash;
        this.lang = lang;
    }

    getChildren() { return this.alias && this.lang ? [ this.name, this.alias, this.lang ] : [ this.name ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}