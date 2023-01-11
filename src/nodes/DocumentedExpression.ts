import Expression from './Expression';
import type Type from './Type';
import type Value from '../runtime/Value';
import type Step from '../runtime/Step';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import type Evaluator from '../runtime/Evaluator';
import Docs from './Docs';
import type { Replacement } from './Node';
import type Translation from '../translation/Translation';
import AtomicExpression from './AtomicExpression';

export default class DocumentedExpression extends AtomicExpression {
    readonly docs: Docs;
    readonly expression: Expression;

    constructor(docs: Docs, expression: Expression) {
        super();

        this.docs = docs;
        this.expression = expression;

        this.computeChildren();
    }

    getGrammar() {
        return [
            { name: 'docs', types: [Docs] },
            { name: 'expression', types: [Expression] },
        ];
    }

    computeConflicts() {}

    computeType(context: Context): Type {
        return this.expression.getType(context);
    }

    getDependencies(): Expression[] {
        return [this.expression];
    }

    compile(context: Context): Step[] {
        return this.expression.compile(context);
    }

    evaluate(evaluator: Evaluator): Value {
        return evaluator.popValue(this);
    }

    clone(replace?: Replacement) {
        return new DocumentedExpression(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('expression', this.expression, replace)
        ) as this;
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
        return current;
    }

    getStart() {
        return this.expression;
    }

    getFinish() {
        return this.expression;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.DocumentedExpression;
    }

    getStartExplanations(translation: Translation) {
        return translation.nodes.DocumentedExpression.start;
    }
}
