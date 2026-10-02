import conciseRef from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import { ImpossibleType } from '#conflicts/ImpossibleType.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { COALESCE_SYMBOL } from '#parser/Symbols.ts';
import Check from '#runtime/Check.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import NoneValue from '#values/NoneValue.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import type Context from '#nodes/Context.ts';
import Expression, {
    ExpressionKind,
    type GuardContext,
} from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import NoneType from '#nodes/NoneType.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import TypeSet from '#nodes/TypeSet.ts';
import UnionType from '#nodes/UnionType.ts';

export default class Otherwise extends SimpleExpression {
    readonly left: Expression;
    readonly question: Token;
    readonly right: Expression;

    constructor(left: Expression, question: Token, right: Expression) {
        super();

        this.left = left;
        this.question = question;
        this.right = right;

        this.computeChildren();
    }

    static getPossibleReplacements({ node }: ReplaceContext) {
        return node instanceof Expression
            ? [
                  Otherwise.make(node, ExpressionPlaceholder.make()),
                  Otherwise.make(ExpressionPlaceholder.make(), node),
              ]
            : [];
    }

    static getPossibleInsertions() {
        return [];
    }

    static make(left: Expression, right: Expression) {
        return new Otherwise(
            left,
            new Token(COALESCE_SYMBOL, Sym.Otherwise),
            right,
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'Otherwise';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'left',
                kind: node(Expression),
                label: () => (l) => l.glossary.value.word,
            },
            {
                name: 'question',
                kind: node(Sym.Otherwise),
                space: true,
                label: undefined,
            },
            {
                name: 'right',
                kind: node(Expression),
                space: true,
                label: () => (l) => l.glossary.value.word,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Otherwise(
                this.replaceChild('left', this.left, replace),
                this.replaceChild('question', this.question, replace),
                this.replaceChild('right', this.right, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Decisions;
    }

    computeConflicts(context: Context): Conflict[] {
        if (
            !this.left
                .getType(context)
                .getPossibleTypes(context)
                .some((type) => type instanceof NoneType)
        )
            return [new ImpossibleType(this, NoneType.make())];
        return [];
    }

    computeType(context: Context): Type {
        // The type of the expression is all of the types on the left, except ø, and the type on the right.
        const left = this.left.getType(context);
        const right = this.right.getType(context);

        return UnionType.getPossibleUnion(context, [
            ...left
                .getPossibleTypes(context)
                .filter((type) => !(type instanceof NoneType)),
            ...right.getPossibleTypes(context),
        ]);
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const left = this.left.compile(evaluator, context);
        const right = this.right.compile(evaluator, context);

        // Evaluate the condition, jump past the yes if false, otherwise evaluate the yes then jump past the no.
        return [
            new Start(this),
            ...left,
            new Check(this, (evaluator: Evaluator) => {
                const value = evaluator.peekValue();
                // If none, then pop it, and move on to evaluate the right.
                if (value instanceof NoneValue) {
                    evaluator.popValue(this);
                } else {
                    // Otherwise, keep the value on the stack and skip the right expression's steps.
                    evaluator.jump(right.length);
                }
                return undefined;
            }),
            ...right,
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return evaluator.popValue(this);
    }

    getDependencies(): Expression[] {
        return [this.left, this.right];
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext): TypeSet {
        // The left always evaluates, so it sees the incoming types.
        const left = this.left.evaluateTypeGuards(current, guard);
        // The right only evaluates when the left was ø, but that says nothing about
        // any *other* name, so pass the incoming types down rather than a guess.
        const right = this.right.evaluateTypeGuards(current, guard);
        // Matching computeType: the value is the left without ø, or else the right.
        return left
            .difference(
                new TypeSet([NoneType.make()], guard.context),
                guard.context,
            )
            .union(right, guard.context);
    }

    getStart() {
        return this.question;
    }

    getFinish() {
        return this.question;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Otherwise;
    getLocalePath() {
        return Otherwise.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Otherwise.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.Otherwise.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            left: conciseRef(this.left, locales, context),
            right: conciseRef(this.right, locales, context),
        };
    }

    getCharacter() {
        return Characters.NoneOr;
    }

    getKind(): ExpressionKind {
        return ExpressionKind.Evaluate;
    }
}
