import conciseRef from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Step from '#runtime/Step.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import type Context from '#nodes/Context.ts';
import Docs from '#nodes/Docs.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import Node, { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';
import { ATTENTION_SYMBOL } from '#parser/Symbols.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

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
            { name: 'docs', kind: node(Docs), label: undefined },
            {
                name: 'expression',
                kind: node(Expression),
                label: () => (l) => l.glossary.value.word,
            },
        ];
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    static getPossibleReplacements({ node, locales }: ReplaceContext) {
        return node instanceof Expression
            ? new DocumentedExpression(Docs.getTemplate(locales), node)
            : [];
    }

    static getPossibleInsertions() {
        return [];
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
        return this.cloned(
            new DocumentedExpression(
                this.replaceChild('docs', this.docs, replace),
                this.replaceChild('expression', this.expression, replace),
            ),
        );
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        return this.expression.evaluateTypeGuards(current, guard);
    }

    /** A doc doesn't change what's being checked, so checks see through it. */
    isGuardMatch(guard: GuardContext): boolean {
        return this.expression.isGuardMatch(guard);
    }

    guardsTypes() {
        return this.expression.guardsTypes();
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

    /** Checks if the 👀 emoji is present in the doc -- if so, highlight the expression */
    hasAttentionEmoji(): boolean {
        return this.docs.docs.some((doc) => {
            const insideExamples = new Set<Node>(
                doc.markup
                    .nodes((n): n is Node => n.getDescriptor() === 'Example')
                    .flatMap((e) => e.nodes()),
            );
            return doc.markup
                .nodes(
                    (n): n is Token =>
                        n instanceof Token && n.isSymbol(Sym.Words),
                )
                .some(
                    (t) =>
                        !insideExamples.has(t) &&
                        t.getText().includes(ATTENTION_SYMBOL),
                );
        });
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            expression: conciseRef(this.expression, locales, context),
        };
    }

    getCharacter() {
        return Characters.DocumentedExpression;
    }
}
