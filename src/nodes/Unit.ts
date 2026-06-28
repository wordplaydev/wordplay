import { Purpose } from '@concepts/Purpose';
import { getPossibleDimensions } from '@edit/menu/getPossibleUnits';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import type Context from '@nodes/Context';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { DOT_SYMBOL, EXPONENT_SYMBOL, LANGUAGE_SYMBOL } from '@parser/Symbols';
import NumberValue from '@values/NumberValue';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import { Emotion } from '../lore/Emotion';
import Dimension from '@nodes/Dimension';
import LanguageToken from '@nodes/LanguageToken';
import Node, {
    list,
    node,
    optional,
    type Grammar,
    type Replacement,
} from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type TypeSet from '@nodes/TypeSet';

export default class Unit extends Node {
    /** In case this was parsed, we keep the original tokens around. */
    readonly numerator: Dimension[];
    readonly slash: Token | undefined;
    readonly denominator: Dimension[];

    /**
     * We store units internally as a map from unit names to a positive or negative non-zero exponent.
     * We only instantiate this map once, in the constructor, and it is immutable after that.
     * It remains undefined if unitless, to save on memory.
     */
    readonly exponents: Map<string, number> | undefined;

    /**
     * True only for the singleton "any unit" wildcard ({@link Unit.Any}), which represents a type
     * declaration that accepts a number with any unit (e.g. a bare `#`). It is distinct from a
     * unitless unit ({@link Unit.Empty}, e.g. `#!`), which accepts only numbers with no unit. A
     * concrete number value is never a wildcard.
     */
    readonly wildcard: boolean;

    constructor(
        exponents: undefined | Map<string, number> = undefined,
        numerator?: Dimension[],
        slash?: Token,
        denominator?: Dimension[],
        wildcard = false,
    ) {
        super();

        this.wildcard = wildcard;

        // Did we parse it? Convert to exponents.
        if (numerator !== undefined || denominator !== undefined) {
            this.numerator = numerator ?? [];
            this.slash =
                slash === undefined &&
                denominator !== undefined &&
                denominator.length > 0
                    ? new LanguageToken()
                    : slash;
            this.denominator = denominator ?? [];

            if (this.numerator.length === 0 && this.denominator.length === 0)
                this.exponents = undefined;
            else {
                this.exponents = new Map();

                for (const dim of this.numerator) {
                    const name = dim.getName();
                    if (name !== undefined) {
                        const exp =
                            dim.exponent === undefined
                                ? 1
                                : NumberValue.fromToken(
                                      dim.exponent,
                                  )[0].toNumber();
                        const current = this.exponents.get(name);
                        this.exponents.set(name, (current ?? 0) + exp);
                    }
                }
                for (const dim of this.denominator) {
                    const name = dim.getName();
                    if (name !== undefined) {
                        const exp =
                            dim.exponent === undefined
                                ? -1
                                : -NumberValue.fromToken(
                                      dim.exponent,
                                  )[0].toNumber();
                        const current = this.exponents.get(name);
                        this.exponents.set(name, (current ?? 0) + exp);
                    }
                }

                // Eliminate any 0 exponent units.
                for (const [unit, exp] of this.exponents)
                    if (exp === 0) this.exponents.delete(unit);
            }
        } else {
            // Start as empty.
            this.numerator = [];
            this.denominator = [];

            // Set the exponents directly, if given, and construct tokens to represent it, in case this unit is displayed or copied.
            if (exponents !== undefined) {
                const cleanExponents = new Map();
                // Eliminate any 0 exponent units.
                for (const unit of exponents.keys()) {
                    const exp = exponents.get(unit);
                    if (exp !== undefined && exp !== 0) {
                        cleanExponents.set(unit, exp);
                        if (exp > 0)
                            this.numerator.push(
                                Dimension.make(
                                    this.numerator.length > 0,
                                    unit,
                                    exp,
                                ),
                            );
                        else {
                            this.denominator.push(
                                Dimension.make(
                                    this.denominator.length > 0,
                                    unit,
                                    Math.abs(exp),
                                ),
                            );
                            if (this.slash === undefined)
                                this.slash = new Token(
                                    LANGUAGE_SYMBOL,
                                    Sym.Language,
                                );
                        }
                    }
                }
                this.exponents = cleanExponents;
            } else {
                this.exponents = new Map();
            }
        }

        this.computeChildren();
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        return node instanceof Unit ? node.getAlternativeUnits(context) : [];
    }

    static getPossibleInsertions({ context }: InsertContext) {
        return getPossibleDimensions(context).map((dim) => Unit.create([dim]));
    }

    /** Selecting the slash token of a Unit (e.g. `m/s`) has no useful
     *  field-level replacements, so surface alternative whole-unit options
     *  at the grandparent level. */
    getReplacementsForTokenAnchor(context: Context): Unit[] {
        return this.getAlternativeUnits(context);
    }

    /** Whole-unit alternatives, shared by getPossibleReplacements (Unit-
     *  anchor case) and getReplacementsForTokenAnchor (token-anchor case). */
    getAlternativeUnits(context: Context): Unit[] {
        const dimensions = getPossibleDimensions(context);
        return [
            // Replace with a single-dimension unit.
            ...dimensions.map((dim) => Unit.create([dim])),
            // Add a dimension to the numerator (skipping ones already present).
            ...dimensions
                .filter((dim) => !this.hasDimension(dim))
                .map((dim) => this.withNumerator(dim)),
            // Add a dimension to the denominator (skipping ones already present).
            ...dimensions
                .filter((dim) => !this.hasDimension(dim))
                .map((dim) => this.withDenominator(dim)),
        ];
    }

    static Empty = new Unit();

    /** The "any unit" wildcard: a type declaration (e.g. a bare `#`) that accepts any unit. */
    static Any = new Unit(undefined, undefined, undefined, undefined, true);

    getDescriptor(): NodeDescriptor {
        return 'Unit';
    }

    getPurpose() {
        return Purpose.Numbers;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'numerator',
                kind: list(true, node(Dimension)),
                label: () => (l) => l.node.Unit.name,
            },
            {
                name: 'slash',
                kind: optional(node(Sym.Language)),
                label: undefined,
            },
            {
                name: 'denominator',
                kind: list(true, node(Dimension)),
                label: () => (l) => l.node.Unit.name,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Unit(
            undefined,
            this.replaceChild('numerator', this.numerator, replace),
            this.replaceChild('slash', this.slash, replace),
            this.replaceChild('denominator', this.denominator, replace),
        ) as this;
    }

    static map(numerator: string[], denominator: string[]) {
        const exponents = new Map<string, number>();
        for (const unit of numerator)
            exponents.set(
                unit,
                exponents.has(unit) ? (exponents.get(unit) ?? 0) + 1 : 1,
            );
        for (const unit of denominator)
            exponents.set(
                unit,
                exponents.has(unit) ? (exponents.get(unit) ?? 0) - 1 : -1,
            );
        return exponents;
    }

    static reuse(numerator: string[] = [], denominator: string[] = []) {
        return Unit.get(Unit.map(numerator, denominator));
    }

    static create(numerator: string[] = [], denominator: string[] = []) {
        return new Unit(Unit.map(numerator, denominator));
    }

    /** A unit pool, since they recur so frequently. We map the exponents to a unique string */
    static Pool = new Map<string, Unit>();

    static get(exponents: Map<string, number> | undefined) {
        if (exponents === undefined || exponents.size === 0) return Unit.Empty;

        // Convert the exponents to a canonical string
        let hash = '';
        for (const key of Array.from(exponents.keys()).sort())
            hash += `${key}${exponents.get(key)}`;

        // See if the string is in the pool
        const cache = Unit.Pool.get(hash);
        if (cache) return cache;

        // Make a new one if not.
        const newUnit = new Unit(exponents);
        Unit.Pool.set(hash, newUnit);
        return newUnit;
    }

    isEmpty() {
        return this.numerator.length === 0 && this.denominator.length === 0;
    }

    /** True for a unit with no dimensions, including the "any unit" wildcard. Use {@link isAny}
     * to distinguish the wildcard from a strictly unitless unit. */
    isUnitless() {
        return this.size() === 0;
    }

    /** True only for the "any unit" wildcard ({@link Unit.Any}). */
    isAny() {
        return this.wildcard;
    }

    size() {
        return this.exponents?.size ?? 0;
    }

    isEqualTo(unit: Unit) {
        if (!(unit instanceof Unit)) return false;
        // A wildcard is only equal to another wildcard.
        if (this.wildcard !== unit.wildcard) return false;
        if (this.size() !== unit.size()) return false;
        if (this.exponents !== undefined && unit.exponents !== undefined)
            for (const key of this.exponents.keys()) {
                if (this.exponents.get(key) !== unit.exponents.get(key))
                    return false;
            }
        return true;
    }

    computeConflicts() {
        return [];
    }

    hasNumerator(dimension: string) {
        return this.numerator.find((dim) => dim.hasDimension(dimension));
    }

    hasDenominator(dimension: string) {
        return this.denominator.find((dim) => dim.hasDimension(dimension));
    }

    hasDimension(dimension: string) {
        return this.hasNumerator(dimension) || this.hasDenominator(dimension);
    }

    withNumerator(dimension: string) {
        return new Unit(
            undefined,
            [
                ...this.numerator,
                Dimension.make(this.numerator.length > 0, dimension, 1),
            ],
            this.slash,
            this.denominator,
        );
    }

    withDenominator(dimension: string) {
        return new Unit(undefined, this.numerator, new LanguageToken(), [
            ...this.denominator,
            Dimension.make(this.denominator.length > 0, dimension, 1),
        ]);
    }

    accepts(unit: Unit): boolean {
        if (!(unit instanceof Unit)) return false;
        // The "any unit" wildcard is compatible in both directions: a `#` declaration accepts
        // any unit, and an "any unit" value is accepted anywhere. (The wildcard only arises from
        // a `#` type declaration; concrete values are always unitless or a specific unit.)
        if (this.isAny() || unit.isAny()) return true;
        // Otherwise the units must match exactly (unitless accepts only unitless).
        return this.isEqualTo(unit);
    }

    acceptsAll(types: TypeSet): boolean {
        return Array.from(types.set).every(
            (type) => type instanceof Unit && this.accepts(type),
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'unit';
    }

    toString(depth?: number) {
        const exp = this.exponents === undefined ? new Map() : this.exponents;
        const units = Array.from(exp.keys()).sort();
        const numerator = units.filter((unit) => (exp.get(unit) ?? 0) > 0);
        const denominator = units.filter((unit) => (exp.get(unit) ?? 0) < 0);

        return (
            (depth === undefined ? '' : '\t'.repeat(depth)) +
            numerator
                .map(
                    (unit) =>
                        `${unit}${
                            (exp.get(unit) ?? 0) > 1
                                ? `${EXPONENT_SYMBOL}${exp.get(unit)}`
                                : ''
                        }`,
                )
                .join(DOT_SYMBOL) +
            (denominator.length > 0 ? LANGUAGE_SYMBOL : '') +
            denominator
                .map(
                    (unit) =>
                        `${unit}${
                            (exp.get(unit) ?? 0) < -1
                                ? `${EXPONENT_SYMBOL}${Math.abs(
                                      exp.get(unit) ?? 0,
                                  )}`
                                : ''
                        }`,
                )
                .join(DOT_SYMBOL)
        );
    }

    root(root: number) {
        if (this.exponents === undefined) return this;

        const newExponents = new Map();

        // Subtract one from every unit's exponent, and if it would be zero, set it to -1.
        for (const [unit, exponent] of this.exponents)
            newExponents.set(
                unit,
                exponent === 1 ? -(root - 1) : exponent - (root - 1),
            );

        return Unit.get(newExponents);
    }

    product(operand: Unit) {
        const newExponents = new Map(this.exponents);

        // Add the given units' exponents to the existing exponents
        for (const [unit, exponent] of operand.exponents ?? new Map()) {
            const currentExponent = newExponents.get(unit);
            newExponents.set(unit, (currentExponent ?? 0) + exponent);
        }

        return Unit.get(newExponents);
    }

    quotient(operand: Unit) {
        const newExponents = new Map(this.exponents);

        // Subtract the given units' exponents from the existing exponents
        for (const [unit, exponent] of operand.exponents ?? new Map()) {
            const currentExponent = newExponents.get(unit);
            newExponents.set(unit, (currentExponent ?? 0) - exponent);
        }

        return Unit.get(newExponents);
    }

    power(exponent: number) {
        // Multiply the exponents by the given exponent.
        const newExponents = new Map(this.exponents);

        // Multiply the units by the power.
        for (const [unit, exp] of this.exponents ?? new Map()) {
            newExponents.set(unit, exp * exponent);
        }

        return Unit.get(newExponents);
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Unit;
    getLocalePath() {
        return Unit.LocalePath;
    }

    getCharacter() {
        return { symbols: this.toWordplay(), emotion: Emotion.kind };
    }

    getDescriptionInputs(locales: Locales) {
        return {
            unit: this.isUnitless()
                ? locales.getUnannotatedText((l) => l.basis.Number.name[0])
                : this.toWordplay(),
        };
    }

    static meters() {
        return Unit.create(['m']);
    }
}
