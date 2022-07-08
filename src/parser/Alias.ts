import type { Token } from "./Token";
import Expression from "./Expression";

export default class Alias extends Expression {
    
    readonly name: Token;
    readonly alias?: Token;
    readonly lang?: Token;

    constructor(name: Token, alias?: Token, lang?: Token) {
        super();

        this.name = name;
        this.alias = alias;
        this.lang = lang;
    }

    getChildren() { return this.alias && this.lang ? [ this.name, this.alias, this.lang ] : [ this.name ]; }

}