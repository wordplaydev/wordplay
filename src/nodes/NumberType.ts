import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { MEASUREMENT_SYMBOL as NUMBER_SYMBOL } from '@parser/Symbols';
import NumberValue from '@values/NumberValue';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import NodeRef from '@locale/NodeRef';
import Characters from '../lore/BasisCharacters';
import BasisType from '@nodes/BasisType';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import { node, optional, type Grammar, type Replacement } from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import PropertyReference from '@nodes/PropertyReference';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type TypeSet from '@nodes/TypeSet';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import Unit from '@nodes/Unit';

export type UnitDeriver = (
    left: Unit,
    right: Unit | undefined,
    constant: number | undefined,
) => Unit;

export default class NumberType extends BasisType {
    readonly number: Token;
    /** The `!` marker for an explicit "no unit" type (e.g. `#!`); undefined otherwise. */
    readonly none: Token | undefined;
    readonly unit: Unit | UnitDeriver;

    readonly op: BinaryEvaluate | UnaryEvaluate | Evaluate | undefined;

    constructor(
        number: Token,
        unit?: Unit | UnitDeriver,
        op?: BinaryEvaluate | UnaryEvaluate | Evaluate,
        none?: Token,
    ) {
        super();

        this.number = number;
        this.none = none;
        // No explicit unit means "no unit" (`#!`) when the none marker is present, otherwise
        // "any unit" (a bare `#`). Concrete values pass an explicit Unit (Unit.Empty for unitless).
        this.unit =
            unit ?? (none !== undefined ? Unit.Empty : Unit.Any);
        this.op = op;

        this.computeChildren();
    }

    static make(
        unit?: Unit | UnitDeriver,
        op?: BinaryEvaluate | UnaryEvaluate | Evaluate,
    ) {
        return new NumberType(
            new Token(NUMBER_SYMBOL, Sym.NumberType),
            unit ?? Unit.Any,
            op,
        );
    }

    static getPossibleReplacements() {
        return [NumberType.make()];
    }

    static getPossibleInsertions() {
        return [NumberType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'NumberType';
    }

    generalize() {
        // Remove the specific number, if there is one, but preserve the unit.
        return NumberType.make(this.unit);
    }

    getGrammar(): Grammar {
        return [
            { name: 'number', kind: node(Sym.NumberType), label: undefined },
            { name: 'none', kind: optional(node(Sym.Literal)), label: undefined },
            { name: 'unit', kind: node(Unit), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new NumberType(
            this.replaceChild('number', this.number, replace),
            this.unit === undefined || this.unit instanceof Function
                ? this.unit
                : this.replaceChild('unit', this.unit, replace),
            undefined,
            this.replaceChild('none', this.none, replace),
        ) as this;
    }

    hasDerivedUnit() {
        return this.unit instanceof Function;
    }

    isPercent() {
        return this.number.getText() === '%';
    }

    /** All types are concrete unless noted otherwise. */
    isGeneric() {
        return this.hasDerivedUnit();
    }

    withOp(op: BinaryEvaluate | UnaryEvaluate | Evaluate) {
        return new NumberType(this.number, this.unit, op, this.none);
    }

    withUnit(unit: Unit): NumberType {
        return new NumberType(this.number, unit);
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        // Are the units compatible? First, get concrete units.
        const thisUnit = this.concreteUnit(context);

        // See if all of the possible types are compatible.
        for (const possibleType of types.set) {
            // Not a number type? Not compatible.
            if (!(possibleType instanceof NumberType)) return false;

            // If it is a number type, get it's unit.
            const thatUnit = possibleType.concreteUnit(context);

            // If this is a percent and the possible type has a unit, it's not compatible.
            // (A unitless number or the "any unit" wildcard counts as unitless.)
            if (this.isPercent() && !thatUnit.isUnitless()) return false;

            // If this is a specific number, then all other possible type must be the same specific number.
            if (
                this.number.isSymbol(Sym.Number) &&
                this.number.getText() !== possibleType.number.getText()
            )
                return false;

            // If the units aren't compatible, then the types aren't compatible. thisUnit is
            // already concrete (concreteUnit evaluates any deriver), so an "any unit" type
            // accepts everything while a "no unit" type accepts only unitless numbers.
            if (!thisUnit.accepts(thatUnit)) return false;
        }
        return true;
    }

    isLiteral() {
        return this.number.isSymbol(Sym.Number);
    }

    getLiteral() {
        return new NumberLiteral(
            this.number.clone(),
            this.unit instanceof Unit && !this.unit.isAny()
                ? this.unit.clone()
                : undefined,
        );
    }

    concreteUnit(context: Context): Unit {
        // If it's a concrete unit, just return it.
        if (this.unit instanceof Unit) return this.unit;

        // If the unit is derived, then there must be an operation for it. If we can't derive
        // a unit, fall back to "any unit" so we stay lenient (the prior behavior skipped the
        // unit check entirely for unresolved derived units).
        if (this.op === undefined) {
            return Unit.Any;
        }

        // What is the type of the left?
        const leftType =
            this.op instanceof BinaryEvaluate
                ? this.op.left.getType(context)
                : this.op instanceof UnaryEvaluate
                  ? this.op.input.getType(context)
                  : this.op.fun instanceof PropertyReference
                    ? this.op.fun.structure.getType(context)
                    : undefined;
        const rightType =
            this.op instanceof BinaryEvaluate
                ? this.op.right.getType(context)
                : this.op instanceof Evaluate && this.op.inputs.length > 0
                  ? this.op.inputs[0].getType(context)
                  : undefined;

        // If either type isn't a number type — which shouldn't be possible for binary operations or evaluates — then we stay lenient with an "any unit".
        if (!(leftType instanceof NumberType)) return Unit.Any;
        if (
            !(this.op instanceof UnaryEvaluate) &&
            !(rightType instanceof NumberType)
        )
            return Unit.Any;

        // Get the constant from the right if available.
        const constant =
            this.op instanceof BinaryEvaluate &&
            this.op.right instanceof NumberLiteral
                ? new NumberValue(
                      this.op.right,
                      this.op.right.number,
                  ).toNumber()
                : undefined;

        // Recursively concretize the left and right units and pass them to the derive the concrete unit.
        return this.unit(
            leftType.concreteUnit(context),
            rightType instanceof NumberType
                ? rightType.concreteUnit(context)
                : undefined,
            constant,
        );
    }

    computeConflicts() {
        return [];
    }

    getBasisTypeName(): BasisTypeName {
        return 'measurement';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.NumberType;
    getLocalePath() {
        return NumberType.LocalePath;
    }

    getCharacter() {
        return Characters.Number;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return {
            unit: this.unit instanceof Unit
                ? new NodeRef(this.unit, locales, context)
                : undefined,
        };
    }

    getDefaultExpression() {
        return NumberLiteral.make(
            1,
            this.unit instanceof Unit && !this.unit.isAny()
                ? this.unit
                : undefined,
        );
    }
}
