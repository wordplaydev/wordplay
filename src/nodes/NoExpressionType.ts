import type Expression from "./Expression"
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations";
import UnknownType from "./UnknownType";

export default class NoExpressionType extends UnknownType<Expression> {

    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(): Translations {
        return {
            eng: `there was no expression given on ${this.expression.toWordplay()}`,
            "😀": TRANSLATE
        }
    }

}