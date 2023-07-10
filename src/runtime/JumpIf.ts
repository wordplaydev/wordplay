import BooleanType from '@nodes/BooleanType';
import type Conditional from '@nodes/Conditional';
import type Locale from '@locale/Locale';
import Bool from './Bool';
import type Evaluator from './Evaluator';
import Step from './Step';
import type Value from './Value';
import concretize from '../locale/concretize';

export default class JumpIf extends Step {
    readonly conditional: Conditional;
    readonly peek: boolean;
    readonly yes: boolean;
    readonly count: number;

    constructor(count: number, peek: boolean, yes: boolean, node: Conditional) {
        super(node);

        this.count = count;
        this.peek = peek;
        this.yes = yes;
        this.conditional = node;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        const value = this.peek
            ? evaluator.peekValue()
            : evaluator.popValue(this.conditional, BooleanType.make());
        if (!(value instanceof Bool)) return value;
        if (value.bool === this.yes) evaluator.jump(this.count);
        return undefined;
    }

    getExplanations(locale: Locale, evaluator: Evaluator) {
        const val = evaluator.peekValue();
        return concretize(
            locale,
            locale.evaluate.jumpif,
            val instanceof Bool && val.bool === this.yes
        );
    }
}
