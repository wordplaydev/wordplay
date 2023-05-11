import Bool from '@runtime/Bool';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import BooleanType from './BooleanType';
import Expression from './Expression';
import type Context from './Context';
import Token from './Token';
import Type from './Type';
import type Bind from './Bind';
import Reference from './Reference';
import PropertyReference from './PropertyReference';
import StructureDefinitionType from './StructureDefinitionType';
import { ImpossibleType } from '@conflicts/ImpossibleType';
import UnionType from './UnionType';
import TypeSet from './TypeSet';
import Start from '@runtime/Start';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeLink';
import Glyphs from '../lore/Glyphs';
import TokenType from './TokenType';
import { TYPE_SYMBOL } from '../parser/Symbols';
import Purpose from '../concepts/Purpose';

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
        return new Is(
            left,
            new Token(TYPE_SYMBOL, TokenType.TypeOperator),
            right
        );
    }

    getGrammar() {
        return [
            { name: 'expression', types: [Expression] },
            { name: 'operator', types: [Token] },
            { name: 'type', types: [Type] },
        ];
    }

    clone(replace?: Replacement) {
        return new Is(
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('operator', this.operator, replace),
            this.replaceChild('type', this.type, replace)
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Decide;
    }

    computeType() {
        return BooleanType.make();
    }
    computeConflicts(context: Context) {
        // Is the type of the expression compatible with the specified type? If not, warn.
        const type = this.expression.getType(context);

        if (
            (type instanceof UnionType &&
                !type.getTypeSet(context).acceptedBy(this.type, context)) ||
            (!(type instanceof UnionType) && !this.type.accepts(type, context))
        )
            return [new ImpossibleType(this, type)];
    }

    getDependencies(): Expression[] {
        return [this.expression];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.expression.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const value = evaluator.popValue(this);

        return new Bool(
            this,
            this.type.accepts(
                value.getType(evaluator.getCurrentContext()),
                evaluator.getCurrentContext()
            )
        );
    }

    /**
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(
        bind: Bind,
        _: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.expression instanceof Reference) {
            // If this is the bind we're looking for and this type check's type is in the set
            if (
                this.expression.resolve(context) === bind &&
                current.acceptedBy(this.type, context)
            )
                return new TypeSet([this.type], context);
        }

        if (
            this.expression instanceof PropertyReference &&
            this.expression.name
        ) {
            const subject = this.expression.getSubjectType(context);
            if (subject instanceof StructureDefinitionType) {
                if (
                    bind ===
                        subject.getDefinition(this.expression.name.getName()) &&
                    current.acceptedBy(this.type, context)
                )
                    return new TypeSet([this.type], context);
            }
        }

        return current;
    }

    getStart() {
        return this.operator;
    }
    getFinish() {
        return this.type;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Is;
    }

    getStartExplanations(translation: Locale, context: Context) {
        return translation.node.Is.start(
            new NodeLink(this.expression, translation, context)
        );
    }

    getFinishExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        const result = evaluator.peekValue();
        return translation.node.Is.finish(
            result instanceof Bool && result.bool,
            new NodeLink(this.type, translation, context)
        );
    }

    getGlyphs() {
        return Glyphs.Type;
    }
}
