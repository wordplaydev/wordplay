import type Conflict from '@conflicts/Conflict';
import { ImpossibleType } from '@conflicts/ImpossibleType';
import type { InsertContext } from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import BoolValue from '@values/BoolValue';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import { TYPE_SYMBOL } from '../parser/Symbols';
import BooleanType from './BooleanType';
import type Context from './Context';
import Expression, { type GuardContext } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import { node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import TypePlaceholder from './TypePlaceholder';
import TypeSet from './TypeSet';
import UnionType from './UnionType';

export default class Is extends Expression {
    readonly expression: Expression;
    readonly operator: Token;
    readonly type: Type;

    constructor(left: Expression, operator: Token, right: Type) {
        super();

        this.operator = operator;
        this.expression = left;
        this.type = right;

        this.computeChildren();
    }

    static make(left: Expression, right: Type) {
        return new Is(left, new Token(TYPE_SYMBOL, Sym.TypeOperator), right);
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleAppends({ type }: InsertContext) {
        return type instanceof BooleanType
            ? [
                  Is.make(
                      ExpressionPlaceholder.make(type),
                      TypePlaceholder.make(),
                  ),
              ]
            : [];
    }

    getDescriptor(): NodeDescriptor {
        return 'Is';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'expression',
                kind: node(Expression),
                label: () => (l) => l.term.value,
            },
            { name: 'operator', kind: node(Sym.Type), label: undefined },
            { name: 'type', kind: node(Type), label: () => (l) => l.term.type },
        ];
    }

    clone(replace?: Replacement) {
        return new Is(
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('operator', this.operator, replace),
            this.replaceChild('type', this.type, replace),
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Types;
    }

    computeType() {
        return BooleanType.make();
    }

    computeConflicts(context: Context): Conflict[] {
        // Is the type of the expression compatible with the specified type? If not, warn.
        const type = this.expression.getType(context);

        if (
            (type instanceof UnionType &&
                !type.getTypeSet(context).acceptedBy(this.type, context)) ||
            (!(type instanceof UnionType) && !this.type.accepts(type, context))
        )
            return [new ImpossibleType(this, type)];
        else return [];
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

        return new BoolValue(
            this,
            this.type.accepts(
                value.getType(evaluator.getCurrentContext()),
                evaluator.getCurrentContext(),
            ),
        );
    }

    /**
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // If the type checked is possible and the expression being guarded is the expression checked, then narrow to the checked type.
        return current.acceptedBy(this.type, guard.context) &&
            this.expression.isGuardMatch(guard)
            ? new TypeSet([this.type], guard.context)
            : current;
    }

    guardsTypes() {
        return true;
    }

    getStart() {
        return this.operator;
    }
    getFinish() {
        return this.type;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Is;
    getLocalePath() {
        return Is.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.Is.start,
            new NodeRef(this.expression, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        const result = evaluator.peekValue();
        return locales.concretize(
            (l) => l.node.Is.finish,
            result instanceof BoolValue && result.bool,
            new NodeRef(this.type, locales, context),
        );
    }

    getCharacter() {
        return Characters.Type;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [new NodeRef(this.type, locales, context)];
    }
}
