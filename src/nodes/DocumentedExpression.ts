import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Context from './Context';
import Docs from './Docs';
import Expression, { type GuardContext } from './Expression';
import { node, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import type Type from './Type';
import type TypeSet from './TypeSet';

export default class DocumentedExpression extends SimpleExpression {
    readonly docs: Docs;
    readonly expression: Expression;

    constructor(docs: Docs, expression: Expression) {
        super();

        this.docs = docs;
        this.expression = expression;

        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
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
        return [];
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

    static readonly LocalePath = (l: LocaleText) => l.node.DocumentedExpression;
    getLocalePath() {
        return DocumentedExpression.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.DocumentedExpression.start);
    }

    getCharacter() {
        return Characters.DocumentedExpression;
    }
}
