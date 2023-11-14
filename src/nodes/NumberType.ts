import type { BasisTypeName } from '../basis/BasisConstants';
import { MEASUREMENT_SYMBOL as NUMBER_SYMBOL } from '@parser/Symbols';
import type Context from './Context';
import Token from './Token';
import Sym from './Sym';
import Unit from './Unit';
import BinaryEvaluate from './BinaryEvaluate';
import BasisType from './BasisType';
import UnaryEvaluate from './UnaryEvaluate';
import NumberLiteral from './NumberLiteral';
import NumberValue from '@values/NumberValue';
import Evaluate from './Evaluate';
import PropertyReference from './PropertyReference';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement } from './Node';
import Glyphs from '../lore/Glyphs';
import NodeRef from '../locale/NodeRef';
import type Locales from '../locale/Locales';

type UnitDeriver = (
    left: Unit,
    right: Unit | undefined,
    constant: number | undefined
) => Unit;

export default class NumberType extends BasisType {
    readonly number: Token;
    readonly unit: Unit | UnitDeriver;

    readonly op: BinaryEvaluate | UnaryEvaluate | Evaluate | undefined;

    constructor(
        number: Token,
        unit?: Unit | UnitDeriver,
        op?: BinaryEvaluate | UnaryEvaluate | Evaluate
    ) {
        super();

        this.number = number;
        this.unit = unit ?? Unit.Empty;
        this.op = op;

        this.computeChildren();
    }

    static make(
        unit?: Unit | UnitDeriver,
        op?: BinaryEvaluate | UnaryEvaluate | Evaluate
    ) {
        return new NumberType(
            new Token(NUMBER_SYMBOL, Sym.NumberType),
            unit ?? Unit.Empty,
            op
        );
    }

    static getPossibleNodes() {
        return [NumberType.make()];
    }

    getDescriptor() {
        return 'NumberType';
    }

    generalize() {
        // Remove the specific number, if there is one, but preserve the unit.
        return NumberType.make(this.unit);
    }

    getGrammar(): Grammar {
        return [
            { name: 'number', kind: node(Sym.NumberType) },
            { name: 'unit', kind: node(Unit) },
        ];
    }

    clone(replace?: Replacement) {
        return new NumberType(
            this.replaceChild('number', this.number, replace),
            this.unit === undefined || this.unit instanceof Function
                ? this.unit
                : this.replaceChild('unit', this.unit, replace)
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
        return new NumberType(this.number, this.unit, op);
    }

    withUnit(unit: Unit): NumberType {
        return new NumberType(this.number, unit);
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        // Are the units compatible? First, get concrete units.
        const thisUnit = this.concreteUnit(context);

        // See if all of the possible types are compatible.
        for (const possibleType of types.set) {
            // Not a measurement type? Not compatible.
            if (!(possibleType instanceof NumberType)) return false;

            // If it is a measurement type, get it's unit.
            const thatUnit = possibleType.concreteUnit(context);

            // If this is a percent and the possible type has a unit, it's not compatible.
            if (this.isPercent() && !thatUnit.isUnitless()) return false;

            // If this is a specific number, then all other possible type must be the same specific number.
            if (
                this.number.isSymbol(Sym.Number) &&
                this.number.getText() !== possibleType.number.getText()
            )
                return false;

            // If the units aren't compatible, then the the types aren't compatible.
            if (
                !(this.unit instanceof Function || this.unit.isUnitless()) &&
                !thisUnit.accepts(thatUnit)
            )
                return false;
        }
        return true;
    }

    isLiteral() {
        return this.number.isSymbol(Sym.Number);
    }

    getLiteral() {
        return new NumberLiteral(
            this.number.clone(),
            this.unit instanceof Unit ? this.unit.clone() : undefined
        );
    }

    concreteUnit(context: Context): Unit {
        // If it's a concrete unit, just return it.
        if (this.unit instanceof Unit) return this.unit;

        // If the unit is derived, then there must be an operation for it.
        if (this.op === undefined) {
            // console.error(
            //     "NumberType with derived unit didn't receive an operator, so unit can't be derived."
            // );
            return Unit.Empty;
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

        // If either type isn't a number type — which shouldn't be possible for binary operations or evaluates — then we just return a blank unit.
        if (!(leftType instanceof NumberType)) return Unit.Empty;
        if (
            !(this.op instanceof UnaryEvaluate) &&
            !(rightType instanceof NumberType)
        )
            return Unit.Empty;

        // Get the constant from the right if available.
        const constant =
            this.op instanceof BinaryEvaluate &&
            this.op.right instanceof NumberLiteral
                ? new NumberValue(
                      this.op.right,
                      this.op.right.number
                  ).toNumber()
                : undefined;

        // Recursively concretize the left and right units and pass them to the derive the concrete unit.
        return this.unit(
            leftType.concreteUnit(context),
            rightType instanceof NumberType
                ? rightType.concreteUnit(context)
                : undefined,
            constant
        );
    }

    computeConflicts() {
        return;
    }

    getBasisTypeName(): BasisTypeName {
        return 'measurement';
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.NumberType);
    }

    getGlyphs() {
        return Glyphs.Number;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [
            this.unit instanceof Unit
                ? new NodeRef(this.unit, locales, context)
                : undefined,
        ];
    }
}
