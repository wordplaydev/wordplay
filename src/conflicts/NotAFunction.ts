import type BinaryOperation from '../nodes/BinaryOperation';
import Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type UnaryOperation from '../nodes/UnaryOperation';
import type Expression from '../nodes/Expression';
import type Token from '../nodes/Token';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';

export default class NotAFunction extends Conflict {
    readonly evaluate: Evaluate | BinaryOperation | UnaryOperation;
    readonly type: Type;
    readonly expression: Expression | Token;

    constructor(
        evaluate: Evaluate | BinaryOperation | UnaryOperation,
        expression: Expression | Token,
        type: Type
    ) {
        super(false);

        this.evaluate = evaluate;
        this.expression = expression;
        this.type = type;
    }

    getConflictingNodes() {
        return {
            primary:
                this.evaluate instanceof Evaluate
                    ? this.evaluate.func
                    : this.evaluate.operator,
            secondary: [],
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotAFunction.primary({
            name: this.evaluate.toWordplay(),
            type: this.type,
        });
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
