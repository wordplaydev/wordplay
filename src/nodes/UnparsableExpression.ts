import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type Evaluator from '@runtime/Evaluator';
import Halt from '@runtime/Halt';
import UnparsableException from '@runtime/UnparsableException';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import type Bind from './Bind';
import type Expression from './Expression';
import Node, { type Replacement } from './Node';
import type TypeSet from './TypeSet';
import UnparsableType from './UnparsableType';
import type Translation from '@translation/Translation';
import AtomicExpression from './AtomicExpression';

export default class UnparsableExpression extends AtomicExpression {
    readonly unparsables: Node[];

    constructor(nodes: Node[]) {
        super();

        this.unparsables = nodes;
    }

    getGrammar() {
        return [{ name: 'unparsables', types: [[Node]] }];
    }

    computeConflicts(): void | Conflict[] {
        return [new UnparsableConflict(this)];
    }

    clone(replace?: Replacement): this {
        return new UnparsableExpression(
            this.replaceChild('unparsables', this.unparsables, replace)
        ) as this;
    }

    computeType() {
        return new UnparsableType(this.unparsables);
    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet) {
        return current;
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [
            new Halt(
                (evaluator) => new UnparsableException(evaluator, this),
                this
            ),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
        return new UnparsableException(evaluator, this);
    }

    getStart() {
        return this.getFirstLeaf() ?? this;
    }

    getFinish() {
        return this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.UnparsableExpression;
    }

    getStartExplanations(translation: Translation) {
        return translation.nodes.UnparsableExpression.start;
    }
}
