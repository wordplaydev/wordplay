import BoolValue from '@values/BoolValue';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import BooleanType from './BooleanType';
import Expression, { type GuardContext } from './Expression';
import type Context from './Context';
import Token from './Token';
import Type from './Type';
import { ImpossibleType } from '@conflicts/ImpossibleType';
import UnionType from './UnionType';
import TypeSet from './TypeSet';
import Start from '@runtime/Start';
import { node, type Grammar, type Replacement } from './Node';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import Sym from './Sym';
import { TYPE_SYMBOL } from '../parser/Symbols';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import TypePlaceholder from './TypePlaceholder';
import type Node from './Node';
import type Locales from '../locale/Locales';
import type Conflict from '@conflicts/Conflict';

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

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean,
    ) {
        return [
            Is.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
            ...(node instanceof Expression && selected
                ? [Is.make(node, TypePlaceholder.make())]
                : []),
        ];
    }

    getDescriptor() {
        return 'Is';
    }

    getGrammar(): Grammar {
        return [
            { name: 'expression', kind: node(Expression) },
            { name: 'operator', kind: node(Sym.Type) },
            { name: 'type', kind: node(Type) },
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
        return Purpose.Decide;
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Is);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.Is.start),
            new NodeRef(this.expression, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        const result = evaluator.peekValue();
        return concretize(
            locales,
            locales.get((l) => l.node.Is.finish),
            result instanceof BoolValue && result.bool,
            new NodeRef(this.type, locales, context),
        );
    }

    getGlyphs() {
        return Glyphs.Type;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [new NodeRef(this.type, locales, context)];
    }
}
