import type BinaryOperation from '../nodes/BinaryOperation';
import BooleanType from '../nodes/BooleanType';
import type Conditional from '../nodes/Conditional';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '../parser/Tokenizer';
import Bool from './Bool';
import type Evaluator from './Evaluator';
import Step from './Step';
import type Value from './Value';

export default class JumpIf extends Step {
    readonly conditional: Conditional | BinaryOperation;
    readonly peek: boolean;
    readonly yes: boolean;
    readonly count: number;

    constructor(
        count: number,
        peek: boolean,
        yes: boolean,
        node: Conditional | BinaryOperation
    ) {
        super(node);

        this.count = count;
        this.peek = peek;
        this.yes = yes;
        this.conditional = node;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        const value = this.peek
            ? evaluator.peekValue()
            : evaluator.popValue(BooleanType.make());
        if (!(value instanceof Bool)) return value;
        if (value.bool === this.yes) evaluator.jump(this.count);
        return undefined;
    }

    getExplanations(): Translations {
        return {
            eng: `Jumping ahead if the value on the stack is ${
                this.yes ? TRUE_SYMBOL : FALSE_SYMBOL
            }.`,
            '😀': `${TRANSLATE} ⏭?`,
        };
    }
}
