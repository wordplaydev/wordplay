import type { BasisTypeName } from '@basis/BasisConstants';
import { Purpose } from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import type { NodeDescriptor } from '@locale/NodeTexts';
import BasisType from '@nodes/BasisType';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import resolveDerivedUnit, { type UnitDeriver } from '@nodes/DerivedUnit';
import type Evaluate from '@nodes/Evaluate';
import { node, optional, type Grammar, type Replacement } from '@nodes/Node';
import NumberType from '@nodes/NumberType';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type TypeSet from '@nodes/TypeSet';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import Unit from '@nodes/Unit';
import { RANGE_SYMBOL } from '@parser/Symbols';
import Characters from '../lore/BasisCharacters';

/**
 * The Range type, `‥` (see LANGUAGE.md). A value of this type is a pair of number bounds
 * that can be asked whether it contains a number (`∋`), spread into a list (`[:1‥10]`), or
 * used as a match key. Its unit works exactly as a number's does — `‥` accepts any unit,
 * `‥!` only unitless, and `‥m` only meters — because a range is made of two numbers.
 */
export default class RangeType extends BasisType {
    readonly range: Token;
    /** The `!` marker for an explicit "no unit" type (`‥!`); undefined otherwise. */
    readonly none: Token | undefined;
    readonly unit: Unit | UnitDeriver;
    readonly op: BinaryEvaluate | UnaryEvaluate | Evaluate | undefined;

    constructor(
        range: Token,
        unit?: Unit | UnitDeriver,
        op?: BinaryEvaluate | UnaryEvaluate | Evaluate,
        none?: Token,
    ) {
        super();

        this.range = range;
        this.none = none;
        // Mirrors NumberType: no explicit unit means "no unit" when the none marker is
        // present, and otherwise "any unit".
        this.unit = unit ?? (none !== undefined ? Unit.Empty : Unit.Any);
        this.op = op;

        this.computeChildren();
    }

    static make(
        unit?: Unit | UnitDeriver,
        op?: BinaryEvaluate | UnaryEvaluate | Evaluate,
    ) {
        return new RangeType(
            new Token(RANGE_SYMBOL, Sym.Range),
            unit ?? Unit.Any,
            op,
        );
    }

    static getPossibleReplacements() {
        return [RangeType.make()];
    }

    static getPossibleInsertions() {
        return [RangeType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'RangeType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'range', kind: node(Sym.Range), label: undefined },
            {
                name: 'none',
                kind: optional(node(Sym.Literal)),
                label: undefined,
            },
            { name: 'unit', kind: node(Unit), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new RangeType(
            this.replaceChild('range', this.range, replace),
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

    /** All types are concrete unless noted otherwise. */
    isGeneric() {
        return this.hasDerivedUnit();
    }

    withOp(op: BinaryEvaluate | UnaryEvaluate | Evaluate) {
        return new RangeType(this.range, this.unit, op, this.none);
    }

    withUnit(unit: Unit): RangeType {
        return new RangeType(this.range, unit);
    }

    concreteUnit(context: Context): Unit {
        if (this.unit instanceof Unit) return this.unit;
        if (this.op === undefined) return Unit.Any;
        // A range has no constant to scale by, so the deriver never asks for one.
        return resolveDerivedUnit(this.op, context, this.unit, () => undefined);
    }

    /** The type of the numbers this range contains and enumerates. */
    getElementType(context: Context): NumberType {
        return NumberType.make(this.concreteUnit(context));
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        const thisUnit = this.concreteUnit(context);
        for (const possibleType of types.set) {
            if (!(possibleType instanceof RangeType)) return false;
            if (!thisUnit.accepts(possibleType.concreteUnit(context)))
                return false;
        }
        return true;
    }

    generalize() {
        return RangeType.make(this.unit);
    }

    computeConflicts() {
        return [];
    }

    getBasisTypeName(): BasisTypeName {
        return 'range';
    }

    getPurpose() {
        return Purpose.Numbers;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.RangeType;
    getLocalePath() {
        return RangeType.LocalePath;
    }

    getDescriptionInputs(locales: Locales): Record<string, TemplateInput> {
        return {
            unit:
                this.unit instanceof Unit && !this.unit.isAny()
                    ? this.unit.toWordplay()
                    : undefined,
        };
    }

    getCharacter() {
        return Characters.Range;
    }
}
