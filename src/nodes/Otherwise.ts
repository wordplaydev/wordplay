import type Conflict from '@conflicts/Conflict';
import { ImpossibleType } from '@conflicts/ImpossibleType';
import type { ReplaceContext } from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { COALESCE_SYMBOL } from '@parser/Symbols';
import Check from '@runtime/Check';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import NoneValue from '@values/NoneValue';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Context from './Context';
import Expression, { ExpressionKind } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import { node, type Grammar, type Replacement } from './Node';
import NoneType from './NoneType';
import SimpleExpression from './SimpleExpression';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import UnionType from './UnionType';

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
                label: () => (l) => l.term.value,
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
                label: () => (l) => l.term.value,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Otherwise(
            this.replaceChild('left', this.left, replace),
            this.replaceChild('question', this.question, replace),
            this.replaceChild('right', this.right, replace),
        ) as this;
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

    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
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
        return locales.concretize(
            (l) => l.node.Otherwise.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getCharacter() {
        return Characters.NoneOr;
    }

    getKind(): ExpressionKind {
        return ExpressionKind.Evaluate;
    }
}
