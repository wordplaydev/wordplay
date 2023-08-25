import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type Evaluator from '@runtime/Evaluator';
import Halt from '@runtime/Halt';
import UnparsableException from '@values/UnparsableException';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import type Bind from './Bind';
import type Expression from './Expression';
import Node, { node, type Grammar, type Replacement, list } from './Node';
import type TypeSet from './TypeSet';
import UnparsableType from './UnparsableType';
import type Locale from '@locale/Locale';
import SimpleExpression from './AtomicExpression';
import Glyphs from '../lore/Glyphs';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';

export default class UnparsableExpression extends SimpleExpression {
    readonly unparsables: Node[];

    constructor(nodes: Node[]) {
        super();

        this.unparsables = nodes;
    }

    getGrammar(): Grammar {
        return [{ name: 'unparsables', kind: list(node(Node)) }];
    }

    getPurpose() {
        return Purpose.Evaluate;
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

    getNodeLocale(translation: Locale) {
        return translation.node.UnparsableExpression;
    }

    getStartExplanations(translation: Locale) {
        return concretize(
            translation,
            translation.node.UnparsableExpression.start
        );
    }

    getGlyphs() {
        return Glyphs.Unparsable;
    }

    isEmpty() {
        return this.unparsables.length === 0;
    }
}
