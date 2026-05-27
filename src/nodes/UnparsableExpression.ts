import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Halt from '@runtime/Halt';
import type Step from '@runtime/Step';
import UnparsableException from '@values/UnparsableException';
import type Value from '@values/Value';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import Node, { list, node, type Grammar, type Replacement } from '@nodes/Node';
import SimpleExpression from '@nodes/SimpleExpression';
import type Token from '@nodes/Token';
import type TypeSet from '@nodes/TypeSet';
import UnparsableType from '@nodes/UnparsableType';

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
        return [
            {
                name: 'unparsables',
                kind: list(true, node(Node)),
                label: undefined,
            },
        ];
    }

    getPurpose() {
        return Purpose.Hidden;
    }

    computeConflicts(context: Context): Conflict[] {
        // An empty unparsable defers to a sibling unparsable in the same parent
        // — it's usually a parser side-effect of running out of tokens while
        // filling required slots, not a separate error. When multiple empty
        // siblings exist (e.g. `←` produces two empty UnparsableExpressions in
        // Previous.number and .stream), only the first emits a conflict.
        if (this.unparsables.length === 0) {
            const parent = context.source.root.getParent(this);
            if (parent) {
                const allUnparsables = parent
                    .nodes()
                    .filter(
                        (n) =>
                            n instanceof UnparsableExpression ||
                            n instanceof UnparsableType,
                    );
                const someWithContent = allUnparsables.some(
                    (n) => n !== this && n.unparsables.length > 0,
                );
                if (someWithContent) return [];
                if (allUnparsables[0] !== this) return [];
            }
        }
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

    static readonly LocalePath = (l: LocaleText) => l.node.UnparsableExpression;
    getLocalePath() {
        return UnparsableExpression.LocalePath;
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
