import type { Token } from "./Token";
import Expression from "./Expression";
import type Program from "./Program";
import type Conflict from "./Conflict";

export default class None extends Expression {
    
    readonly none: Token;
    readonly name?: Token;

    constructor(error: Token, name?: Token) {
        super();

        this.none = error;
        this.name = name;
    }

    getChildren() { return this.name ? [ this.none, this.name ] : [ this.none ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}