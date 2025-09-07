import BooleanType from '@nodes/BooleanType';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import type Value from '../values/Value';
import Step from './Step';

export default class JumpIf extends Step {
    readonly peek: boolean;
    readonly yes: boolean;
    readonly count: number;

    constructor(
        count: number,
        peek: boolean,
        yes: boolean,
        requestor: Expression,
    ) {
        super(requestor);

        this.count = count;
        this.peek = peek;
        this.yes = yes;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        const value = this.peek
            ? evaluator.peekValue()
            : evaluator.popValue(this.node, BooleanType.make());
        if (!(value instanceof BoolValue)) return value;
        if (value.bool === this.yes) evaluator.jump(this.count);
        return undefined;
    }

    getExplanations(locales: Locales, evaluator: Evaluator) {
        const val = evaluator.peekValue();
        return locales.concretize(
            (l) => l.node.Conditional.else,
            val instanceof BoolValue && val.bool === this.yes,
        );
    }
}
