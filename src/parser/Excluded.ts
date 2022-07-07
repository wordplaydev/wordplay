import Expression from "./Expression";
import type { Token } from "./Token";

export default class Excluded extends Expression {
    
    readonly tick: Token;
    readonly expression: Expression;

    constructor(tick: Token, expression: Expression) {
        super();
        this.tick = tick;
        this.expression = expression;
    }

    getChildren() { return [ this.tick, this.expression ]; }

    toWordplay(): string {
        return this.getChildren().map(c => c.toWordplay()).join("");
    }

}