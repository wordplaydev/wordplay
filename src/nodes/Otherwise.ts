import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import Sym from './Sym';
import { node, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import Characters from '../lore/BasisCharacters';
import Purpose from '../concepts/Purpose';
import Expression, { ExpressionKind } from './Expression';
import type TypeSet from './TypeSet';
import type Locales from '../locale/Locales';
import { COALESCE_SYMBOL } from '@parser/Symbols';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Context from './Context';
import NoneType from './NoneType';
import UnionType from './UnionType';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import Check from '@runtime/Check';
import NoneValue from '@values/NoneValue';
import { ImpossibleType } from '@conflicts/ImpossibleType';
import type Conflict from '@conflicts/Conflict';
import type EditContext from '@edit/EditContext';
import type { NodeDescriptor } from '@locale/NodeTexts';

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

    static getPossibleReplacements({ node }: EditContext) {
        return node instanceof Expression
            ? [
                  Otherwise.make(node, ExpressionPlaceholder.make()),
                  Otherwise.make(ExpressionPlaceholder.make(), node),
              ]
            : [];
    }

    static getPossibleAppends({ type }: EditContext) {
        return [
            Otherwise.make(
                ExpressionPlaceholder.make(type),
                ExpressionPlaceholder.make(type),
            ),
        ];
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
            { name: 'left', kind: node(Expression) },
            { name: 'question', kind: node(Sym.Otherwise), space: true },
            { name: 'right', kind: node(Expression), space: true },
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
        return Purpose.Decide;
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Otherwise);
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
