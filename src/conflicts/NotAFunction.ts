import type BinaryOperation from '../nodes/BinaryOperation';
import Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type UnaryOperation from '../nodes/UnaryOperation';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type Expression from '../nodes/Expression';
import type Token from '../nodes/Token';
import PropertyReference from '../nodes/PropertyReference';
import type Type from '../nodes/Type';
import type Context from '../nodes/Context';

export default class NotAFunction extends Conflict {
    readonly evaluate: Evaluate | BinaryOperation | UnaryOperation;
    readonly type: Type | undefined;
    readonly expression: Expression | Token;

    constructor(
        evaluate: Evaluate | BinaryOperation | UnaryOperation,
        expression: Expression | Token,
        type: Type | undefined
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

    getPrimaryExplanation(context: Context): Translations {
        return {
            '😀': TRANSLATE,
            eng: this.type
                ? `Couldn't find a function named ${
                      this.expression instanceof PropertyReference
                          ? `named "${this.expression.name?.toWordplay()}"`
                          : this.expression.toWordplay()
                  } on ${this.type.getDescriptions(context).eng}.`
                : `${this.expression.toWordplay()} is not a function`,
        };
    }
}
