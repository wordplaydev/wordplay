import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type { Token } from "./Token";

export default class AccessName extends Expression {

    readonly subject: Expression;
    readonly access: Token;
    readonly name: Token;

    constructor(subject: Expression, access: Token, name: Token) {
        super();

        this.subject = subject;
        this.access = access;
        this.name = name;
    }

    getChildren() {
        return [ this.subject, this.access, this.name ];
    }

    getConflicts(program: Program): Conflict[] {
        return [];
    }

}