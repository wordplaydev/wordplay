import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type Evaluator from '@runtime/Evaluator';
import Halt from '@runtime/Halt';
import UnparsableException from '@values/UnparsableException';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import type Expression from './Expression';
import Node, { node, type Grammar, type Replacement, list } from './Node';
import type TypeSet from './TypeSet';
import UnparsableType from './UnparsableType';
import SimpleExpression from './SimpleExpression';
import Glyphs from '../lore/Glyphs';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';

export default class UnparsableExpression extends SimpleExpression {
    readonly unparsables: Node[];

    constructor(nodes: Node[]) {
        super();

        this.unparsables = nodes;
    }

    getDescriptor() {
        return 'UnparsableExpression';
    }

    getGrammar(): Grammar {
        return [{ name: 'unparsables', kind: list(true, node(Node)) }];
    }

    getPurpose() {
        return Purpose.Source;
    }

    computeConflicts(): void | Conflict[] {
        return [new UnparsableConflict(this)];
    }

    clone(replace?: Replacement): this {
        return new UnparsableExpression(
            this.replaceChild('unparsables', this.unparsables, replace),
        ) as this;
    }

    computeType() {
        return new UnparsableType(this.unparsables);
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [
            new Halt(
                (evaluator) => new UnparsableException(evaluator, this),
                this,
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.UnparsableExpression);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.UnparsableExpression.start),
        );
    }

    getGlyphs() {
        return Glyphs.Unparsable;
    }

    isEmpty() {
        return this.unparsables.length === 0;
    }
}
