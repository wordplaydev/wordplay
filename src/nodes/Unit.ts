import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import {
    EXPONENT_SYMBOL,
    LANGUAGE_SYMBOL,
    PRODUCT_SYMBOL,
} from '@parser/Symbols';
import NumberValue from '@values/NumberValue';
import type { BasisTypeName } from '../basis/BasisConstants';
import { getPossibleDimensions } from '../edit/getPossibleUnits';
import type Locales from '../locale/Locales';
import Emotion from '../lore/Emotion';
import Dimension from './Dimension';
import LanguageToken from './LanguageToken';
import { list, node, optional, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import type TypeSet from './TypeSet';

export default class Unit extends Type {
    /** In case this was parsed, we keep the original tokens around. */
    readonly numerator: Dimension[];
    readonly slash?: Token;
    readonly denominator: Dimension[];

    /** We store units internally as a map from unit names to a positive or negative non-zero exponent. */
    readonly exponents: Map<string, number>;

    constructor(
        exponents: undefined | Map<string, number> = undefined,
        numerator?: Dimension[] | undefined,
        slash?: Token,
        denominator?: Dimension[],
    ) {
        super();

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

            this.exponents = new Map();

            for (const dim of this.numerator) {
                const name = dim.getName();
                if (name !== undefined) {
                    const exp =
                        dim.exponent === undefined
                            ? 1
                            : NumberValue.fromToken(dim.exponent)[0].toNumber();
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

    static getPossibleReplacements({ node, context }: EditContext) {
        // What dimensions are possible?
        const dimensions = getPossibleDimensions(context);

        return node instanceof Unit
            ? [
                  // Suggest replacing this dimension
                  ...dimensions.map((dim) => Unit.create([dim])),
                  // Suggest adding a dimension to the numerator, except any existing numerators
                  ...dimensions
                      .filter((dim) => !node.hasDimension(dim))
                      .map((dim) => node.withNumerator(dim)),
                  // Suggest adding a dimension to the denominator, except any existing numerators
                  ...dimensions
                      .filter((dim) => !node.hasDimension(dim))
                      .map((dim) => node.withDenominator(dim)),
              ]
            : [];
    }

    static getPossibleAppends({ context }: EditContext) {
        return getPossibleDimensions(context).map((dim) => Unit.create([dim]));
    }

    static Empty = new Unit();

    getDescriptor(): NodeDescriptor {
        return 'Unit';
    }

    getGrammar(): Grammar {
        return [
            { name: 'numerator', kind: list(true, node(Dimension)) },
            { name: 'slash', kind: optional(node(Sym.Language)) },
            { name: 'denominator', kind: list(true, node(Dimension)) },
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

    static reuse(numerator: string[], denominator: string[] = []) {
        return Unit.get(Unit.map(numerator, denominator));
    }

    static create(numerator: string[], denominator: string[] = []) {
        return new Unit(Unit.map(numerator, denominator));
    }

    /** A unit pool, since they recur so frequently. We map the exponents to a unique string */
    static Pool = new Map<string, Unit>();

    static get(exponents: Map<string, number>) {
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

    isUnitless() {
        return this.exponents.size === 0;
    }

    isEqualTo(unit: Unit) {
        return (
            unit instanceof Unit &&
            this.exponents.size === unit.exponents.size &&
            Array.from(this.exponents.keys()).every(
                (key) => this.exponents.get(key) === unit.exponents.get(key),
            )
        );
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

    accepts(unit: Type): boolean {
        // Every key in this exists in the given unit and they have the same exponents.
        return (
            // Is this a unit?
            unit instanceof Unit &&
            // And...
            // The units are equal
            (this.isEqualTo(unit) ||
                // Or this is unitless
                this.isUnitless())
        );
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
        const units = Array.from(this.exponents.keys()).sort();
        const numerator = units.filter(
            (unit) => (this.exponents.get(unit) ?? 0) > 0,
        );
        const denominator = units.filter(
            (unit) => (this.exponents.get(unit) ?? 0) < 0,
        );

        return (
            (depth === undefined ? '' : '\t'.repeat(depth)) +
            numerator
                .map(
                    (unit) =>
                        `${unit}${
                            (this.exponents.get(unit) ?? 0) > 1
                                ? `${EXPONENT_SYMBOL}${this.exponents.get(
                                      unit,
                                  )}`
                                : ''
                        }`,
                )
                .join(PRODUCT_SYMBOL) +
            (denominator.length > 0 ? LANGUAGE_SYMBOL : '') +
            denominator
                .map(
                    (unit) =>
                        `${unit}${
                            (this.exponents.get(unit) ?? 0) < -1
                                ? `${EXPONENT_SYMBOL}${Math.abs(
                                      this.exponents.get(unit) ?? 0,
                                  )}`
                                : ''
                        }`,
                )
                .join(PRODUCT_SYMBOL)
        );
    }

    root(root: number) {
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
        for (const [unit, exponent] of operand.exponents) {
            const currentExponent = newExponents.get(unit);
            newExponents.set(unit, (currentExponent ?? 0) + exponent);
        }

        return Unit.get(newExponents);
    }

    quotient(operand: Unit) {
        const newExponents = new Map(this.exponents);

        // Subtract the given units' exponents from the existing exponents
        for (const [unit, exponent] of operand.exponents) {
            const currentExponent = newExponents.get(unit);
            newExponents.set(unit, (currentExponent ?? 0) - exponent);
        }

        return Unit.get(newExponents);
    }

    power(exponent: number) {
        // Multiply the exponents by the given exponent.
        const newExponents = new Map(this.exponents);

        // Multiply the units by the power.
        for (const [unit, exp] of this.exponents) {
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
        return [
            this.exponents.size === 0
                ? locales.get((l) => l.basis.Number.name[0])
                : this.toWordplay(),
        ];
    }

    static meters() {
        return Unit.create(['m']);
    }
}
