import BooleanType from '@nodes/BooleanType';
import type Locale from '@locale/Locale';
import BoolValue from '@values/BoolValue';
import type Evaluator from '@runtime/Evaluator';
import Step from './Step';
import type Value from '../values/Value';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';

export default class JumpIf extends Step {
    readonly peek: boolean;
    readonly yes: boolean;
    readonly count: number;

    constructor(
        count: number,
        peek: boolean,
        yes: boolean,
        requestor: Expression
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

    getExplanations(locale: Locale, evaluator: Evaluator) {
        const val = evaluator.peekValue();
        return concretize(
            locale,
            locale.node.Conditional.else,
            val instanceof BoolValue && val.bool === this.yes
        );
    }
}
