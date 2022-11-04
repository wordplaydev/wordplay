import type BinaryOperation from "../nodes/BinaryOperation";
import Evaluate from "../nodes/Evaluate";
import Conflict from "./Conflict";
import type UnaryOperation from "../nodes/UnaryOperation";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Expression from "../nodes/Expression";
import type Token from "../nodes/Token";

export default class NotAFunction extends Conflict {
    readonly evaluate: Evaluate | BinaryOperation | UnaryOperation;
    readonly fun: Expression | Token;

    constructor(evaluate: Evaluate | BinaryOperation | UnaryOperation, expression: Expression | Token) {
        super(false);
        this.evaluate = evaluate;
        this.fun = expression;
    }

    getConflictingNodes() {
        return { primary: [ this.evaluate instanceof Evaluate ? this.evaluate.func : this.evaluate.operator ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `${this.fun.toWordplay()} doesn't refer to a function.`
        }
    }

}
