import BooleanType from './BooleanType';
import type Conflict from '@conflicts/Conflict';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import Expression, { type GuardContext } from './Expression';
import Token from './Token';
import type Type from './Type';
import type Step from '@runtime/Step';
import JumpIf from '@runtime/JumpIf';
import Jump from '@runtime/Jump';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import Start from '@runtime/Start';
import { QUESTION_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Finish from '@runtime/Finish';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import { node, type Grammar, type Replacement } from './Node';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Node from './Node';
import type Locales from '../locale/Locales';

export default class Conditional extends Expression {
    readonly condition: Expression;
    readonly question: Token;
    readonly yes: Expression;
    readonly no: Expression;

    constructor(
        condition: Expression,
        conditional: Token,
        yes: Expression,
        no: Expression,
    ) {
        super();

        this.condition = condition;
        this.question = conditional;
        this.yes = yes;
        this.no = no;

        this.computeChildren();
    }

    static make(condition: Expression, yes: Expression, no: Expression) {
        return new Conditional(
            condition,
            new Token(QUESTION_SYMBOL, Sym.BooleanType),
            yes,
            no,
        );
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean,
        context: Context,
    ) {
        return [
            node instanceof Expression &&
            selected &&
            BooleanType.make().accepts(node.getType(context), context)
                ? Conditional.make(
                      node,
                      ExpressionPlaceholder.make(),
                      ExpressionPlaceholder.make(),
                  )
                : Conditional.make(
                      ExpressionPlaceholder.make(BooleanType.make()),
                      ExpressionPlaceholder.make(),
                      ExpressionPlaceholder.make(),
                  ),
        ];
    }

    getDescriptor() {
        return 'Conditional';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'condition',
                kind: node(Expression),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Conditional.condition),
                // Must be boolean typed
                getType: () => BooleanType.make(),
            },
            {
                name: 'question',
                kind: node(Sym.Conditional),
                space: true,
            },
            {
                name: 'yes',
                kind: node(Expression),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Conditional.yes),
                space: true,
                indent: true,
            },
            {
                name: 'no',
                kind: node(Expression),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Conditional.no),
                space: true,
                indent: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Conditional(
            this.replaceChild('condition', this.condition, replace),
            this.replaceChild<Token>('question', this.question, replace),
            this.replaceChild<Expression>('yes', this.yes, replace),
            this.replaceChild<Expression>('no', this.no, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Decide;
    }

    computeConflicts(context: Context): Conflict[] {
        const children = [];

        const conditionType = this.condition.getType(context);
        if (!(conditionType instanceof BooleanType))
            children.push(new ExpectedBooleanCondition(this, conditionType));

        return children;
    }

    computeType(context: Context): Type {
        // Whatever type the yes/no returns.
        const yesType = this.yes.getType(context);
        const noType = this.no.getType(context);
        return UnionType.getPossibleUnion(context, [yesType, noType]);
    }

    getDependencies(): Expression[] {
        return [this.condition, this.yes, this.no];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const yes = this.yes.compile(evaluator, context);
        const no = this.no.compile(evaluator, context);

        // Evaluate the condition, jump past the yes if false, otherwise evaluate the yes then jump past the no.
        return [
            new Start(this),
            ...this.condition.compile(evaluator, context),
            new JumpIf(yes.length + 1, false, false, this),
            ...yes,
            new Jump(no.length, this),
            ...no,
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Pop the value we computed and then return it (so that it's saved for later).
        return evaluator.popValue(this);
    }

    /**
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // Evaluate the condition with the current types.
        const revisedTypes = this.condition.evaluateTypeGuards(current, guard);

        // The condition did some guarding if the intersection of the revised and current sets is smaller than the current set
        const guarded =
            current.intersection(revisedTypes, guard.context).size() <
            current.size();

        // Evaluate the yes branch with the revised types.
        if (this.yes instanceof Expression)
            this.yes.evaluateTypeGuards(revisedTypes, guard);

        // Evaluate the no branch with the complement of the revised types, unless they weren't guarded, in which case we pass through the current types.
        if (this.no instanceof Expression) {
            this.no.evaluateTypeGuards(
                guarded
                    ? current.difference(revisedTypes, guard.context)
                    : current,
                guard,
            );
        }

        return current;
    }

    getStart() {
        return this.question;
    }

    getFinish() {
        return this.question;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Conditional);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.Conditional.start),
            new NodeRef(this.condition, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.Conditional.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Conditional;
    }
}
