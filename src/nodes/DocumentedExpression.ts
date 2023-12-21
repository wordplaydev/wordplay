import Expression, { type GuardContext } from './Expression';
import type Type from './Type';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import type Context from './Context';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import Docs from './Docs';
import { node, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import Glyphs from '../lore/Glyphs';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';

export default class DocumentedExpression extends SimpleExpression {
    readonly docs: Docs;
    readonly expression: Expression;

    constructor(docs: Docs, expression: Expression) {
        super();

        this.docs = docs;
        this.expression = expression;

        this.computeChildren();
    }

    getDescriptor() {
        return 'DocumentedExpression';
    }

    getGrammar(): Grammar {
        return [
            { name: 'docs', kind: node(Docs) },
            { name: 'expression', kind: node(Expression) },
        ];
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts() {
        return;
    }

    computeType(context: Context): Type {
        return this.expression.getType(context);
    }

    getDependencies(): Expression[] {
        return [this.expression];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return this.expression.compile(evaluator, context);
    }

    evaluate(evaluator: Evaluator): Value {
        return evaluator.popValue(this);
    }

    clone(replace?: Replacement) {
        return new DocumentedExpression(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('expression', this.expression, replace),
        ) as this;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        return this.expression.evaluateTypeGuards(current, guard);
    }

    getStart() {
        return this.expression;
    }

    getFinish() {
        return this.expression;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.DocumentedExpression);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.DocumentedExpression.start),
        );
    }

    getGlyphs() {
        return Glyphs.DocumentedExpression;
    }
}
