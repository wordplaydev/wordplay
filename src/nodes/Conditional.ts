import BooleanType from './BooleanType';
import type Conflict from '@conflicts/Conflict';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Step from '@runtime/Step';
import JumpIf from '@runtime/JumpIf';
import Jump from '@runtime/Jump';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import type Bind from './Bind';
import Start from '@runtime/Start';
import { QUESTION_SYMBOL } from '@parser/Symbols';
import Symbol from './Symbol';
import Finish from '@runtime/Finish';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Node from './Node';

export default class Conditional extends Expression {
    readonly condition: Expression;
    readonly question: Token;
    readonly yes: Expression;
    readonly no: Expression;

    constructor(
        condition: Expression,
        conditional: Token,
        yes: Expression,
        no: Expression
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
            new Token(QUESTION_SYMBOL, Symbol.BooleanType),
            yes,
            no
        );
    }

    static getPossibleNodes(
        type: Type | undefined,
        selection: Node | undefined,
        context: Context
    ) {
        return [
            Conditional.make(
                ExpressionPlaceholder.make(BooleanType.make()),
                ExpressionPlaceholder.make(),
                ExpressionPlaceholder.make()
            ),
            ...(selection instanceof Expression &&
            BooleanType.make().accepts(selection.getType(context), context)
                ? [
                      Conditional.make(
                          selection,
                          ExpressionPlaceholder.make(),
                          ExpressionPlaceholder.make()
                      ),
                  ]
                : []),
        ];
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'condition',
                kind: node(Expression),
                label: (translation: Locale) =>
                    translation.node.Conditional.condition,
                // Must be boolean typed
                getType: () => BooleanType.make(),
            },
            {
                name: 'question',
                kind: node(Symbol.Conditional),
                space: true,
            },
            {
                name: 'yes',
                kind: node(Expression),
                label: (translation: Locale) =>
                    translation.node.Conditional.yes,
                space: true,
                indent: true,
            },
            {
                name: 'no',
                kind: node(Expression),
                label: (translation: Locale) => translation.node.Conditional.no,
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
            this.replaceChild<Expression>('no', this.no, replace)
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

    compile(context: Context): Step[] {
        const yes = this.yes.compile(context);
        const no = this.no.compile(context);

        // Evaluate the condition, jump past the yes if false, otherwise evaluate the yes then jump past the no.
        return [
            new Start(this),
            ...this.condition.compile(context),
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
    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        // Evaluate the condition with the current types.
        const revisedTypes = this.condition.evaluateTypeSet(
            bind,
            original,
            current,
            context
        );

        // Evaluate the yes branch with the revised types.
        if (this.yes instanceof Expression)
            this.yes.evaluateTypeSet(bind, original, revisedTypes, context);

        // Evaluate the no branch with the complement of the revised types.
        if (this.no instanceof Expression) {
            this.no.evaluateTypeSet(
                bind,
                original,
                current.difference(revisedTypes, context),
                context
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

    getNodeLocale(translation: Locale) {
        return translation.node.Conditional;
    }

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.Conditional.start,
            new NodeRef(this.condition, locale, context)
        );
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.Conditional.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Conditional;
    }
}
