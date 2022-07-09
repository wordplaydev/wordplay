import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type { Token } from "./Token";

export default class Stream extends Expression {

    readonly initial: Expression;
    readonly dots: Token;
    readonly stream: Expression;
    readonly next: Expression;

    constructor(initial: Expression, dots: Token, stream: Expression, next: Expression) {
        super();

        this.initial = initial;
        this.dots = dots;
        this.stream = stream;
        this.next = next;

    }

    getChildren() {
        return [ this.initial, this.dots, this.stream, this.next ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}