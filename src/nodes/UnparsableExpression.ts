import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Halt from '@runtime/Halt';
import type Step from '@runtime/Step';
import UnparsableException from '@values/UnparsableException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Context from './Context';
import type Expression from './Expression';
import Node, { list, node, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import type Token from './Token';
import type TypeSet from './TypeSet';
import UnparsableType from './UnparsableType';

export default class UnparsableExpression extends SimpleExpression {
    readonly unparsables: Token[];

    constructor(nodes: Token[]) {
        super();

        this.unparsables = nodes;
    }

    getDescriptor(): NodeDescriptor {
        return 'UnparsableExpression';
    }

    getGrammar(): Grammar {
        return [{ name: 'unparsables', kind: list(true, node(Node)) }];
    }

    getPurpose() {
        return Purpose.Source;
    }

    computeConflicts(context: Context): Conflict[] {
        return [new UnparsableConflict(this, context)];
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
        return locales.concretize((l) => l.node.UnparsableExpression.start);
    }

    getCharacter() {
        return Characters.Unparsable;
    }

    isEmpty() {
        return this.unparsables.length === 0;
    }
}
