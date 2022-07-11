import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type { Token } from "./Token";
import type Type from "./Type";
import type Unparsable from "./Unparsable";

export default class Stream extends Expression {

    readonly initial: Expression;
    readonly dots: Token;
    readonly stream: Expression | Unparsable;
    readonly next: Expression | Unparsable;

    constructor(initial: Expression, dots: Token, stream: Expression | Unparsable, next: Expression | Unparsable) {
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

    getType(program: Program): Type {
        // The type depends on the type of the initial value.
        return this.initial.getType(program);
    }

}