import type Conflict from '#conflicts/Conflict.ts';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import MarkupValue from '#values/MarkupValue.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import type Context from '#nodes/Context.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import FormattedType from '#nodes/FormattedType.ts';
import Language from '#nodes/Language.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';
import TextType from '#nodes/TextType.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import UnionType from '#nodes/UnionType.ts';

/**
 * Applies a locale tag to a computed text value, e.g. `(greeting + name)/en`.
 * Overrides whatever locale the inner expression's text would otherwise have,
 * letting creators tag text produced by computation. Only valid on Text or
 * Formatted text, the only types that can carry a locale.
 */
export default class Localized extends SimpleExpression {
    readonly expression: Expression;
    readonly language: Language;

    constructor(expression: Expression, language: Language) {
        super();

        this.expression = expression;
        this.language = language;

        this.computeChildren();
    }

    static make(expression: Expression, language: Language) {
        return new Localized(expression, language);
    }

    static getPossibleReplacements({ node, type }: ReplaceContext) {
        // Offer to wrap a selected text/formatted expression in a locale tag
        // (e.g. `expr/en`), preserving the expression.
        return node instanceof Expression &&
            (type instanceof TextType || type instanceof FormattedType)
            ? [Localized.make(node, Language.make('en'))]
            : [];
    }

    static getPossibleInsertions({ type }: InsertContext) {
        return type instanceof TextType || type instanceof FormattedType
            ? [
                  Localized.make(
                      ExpressionPlaceholder.make(type),
                      Language.make('en'),
                  ),
              ]
            : [];
    }

    getDescriptor(): NodeDescriptor {
        return 'Localized';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'expression',
                kind: node(Expression),
                label: () => (l) => l.node.Localized.label.value,
            },
            { name: 'language', kind: node(Language), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Localized(
                this.replaceChild('expression', this.expression, replace),
                this.replaceChild('language', this.language, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Text;
    }

    computeConflicts(context: Context): Conflict[] {
        // Only Text and Formatted text can carry a locale tag.
        const type = this.expression.getType(context);
        if (
            !context.isUnknownDownstream(this.expression) &&
            !type
                .getPossibleTypes(context)
                .every(
                    (possible) =>
                        possible instanceof TextType ||
                        possible instanceof FormattedType,
                )
        )
            return [
                new IncompatibleInput(
                    this,
                    type,
                    UnionType.make(TextType.make(), FormattedType.make()),
                ),
            ];

        return [];
    }

    computeType(context: Context): Type {
        const type = this.expression.getType(context);
        // Re-tag text or formatted text with the given locale; leave other
        // types unchanged.
        if (type instanceof TextType)
            return TextType.make(undefined, this.language);
        if (type instanceof FormattedType)
            return FormattedType.make(this.language);
        return type;
    }

    getDependencies(): Expression[] {
        return [this.expression];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            ...this.expression.compile(evaluator, context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const value = evaluator.popValue(this);

        // Re-tag text or formatted text with the given locale, overriding any
        // existing tag. Other values pass through unchanged.
        if (value instanceof TextValue)
            return new TextValue(this, value.text, this.language);
        if (value instanceof MarkupValue)
            return new MarkupValue(this, value.markup, this.language);
        return value;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        this.expression.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.expression;
    }
    getFinish() {
        return this.language;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Localized;
    getLocalePath() {
        return Localized.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.Localized.start, {
            value: new NodeRef(this.expression, locales, context),
        });
    }

    getCharacter() {
        return Characters.Language;
    }
}
