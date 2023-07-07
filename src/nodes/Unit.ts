import {
    QUESTION_SYMBOL,
    EXPONENT_SYMBOL,
    LANGUAGE_SYMBOL,
} from '@parser/Symbols';
import { PRODUCT_SYMBOL } from '@parser/Symbols';
import Dimension from './Dimension';
import Token from './Token';
import Type from './Type';
import Measurement from '@runtime/Measurement';
import type TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import LanguageToken from './LanguageToken';
import TokenType from './TokenType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Emotion from '../lore/Emotion';

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
        denominator?: Dimension[]
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
                const exp =
                    dim.exponent === undefined
                        ? 1
                        : Measurement.fromToken(dim.exponent).toNumber();
                const current = this.exponents.get(name);
                this.exponents.set(name, (current ?? 0) + exp);
            }
            for (const dim of this.denominator) {
                const name = dim.getName();
                const exp =
                    dim.exponent === undefined
                        ? -1
                        : -Measurement.fromToken(dim.exponent).toNumber();
                const current = this.exponents.get(name);
                this.exponents.set(name, (current ?? 0) + exp);
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
                                    exp
                                )
                            );
                        else {
                            this.denominator.push(
                                Dimension.make(
                                    this.numerator.length > 0,
                                    unit,
                                    exp
                                )
                            );
                            if (this.slash === undefined)
                                this.slash = new Token(
                                    LANGUAGE_SYMBOL,
                                    TokenType.Language
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

    static Empty = new Unit();
    static Wildcard = (() => {
        const exp = new Map();
        exp.set(QUESTION_SYMBOL, 1);
        return new Unit(exp);
    })();

    getGrammar() {
        return [
            { name: 'numerator', types: [[Dimension]] },
            { name: 'slash', types: [Token, undefined] },
            { name: 'denominator', types: [[Dimension]] },
        ];
    }

    clone(replace?: Replacement) {
        return new Unit(
            this.exponents === undefined ? undefined : new Map(this.exponents),
            this.replaceChild('numerator', this.numerator, replace),
            this.replaceChild('slash', this.slash, replace),
            this.replaceChild('denominator', this.denominator, replace)
        ) as this;
    }

    static map(numerator: string[], denominator: string[]) {
        const exponents = new Map<string, number>();
        for (const unit of numerator)
            exponents.set(
                unit,
                exponents.has(unit) ? (exponents.get(unit) ?? 0) + 1 : 1
            );
        for (const unit of denominator)
            exponents.set(
                unit,
                exponents.has(unit) ? (exponents.get(unit) ?? 0) - 1 : -1
            );
        return exponents;
    }

    static make(numerator: string[], denominator: string[] = []) {
        return Unit.get(Unit.map(numerator, denominator));
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

    isWildcard() {
        return this.exponents.get('?') === 1;
    }
    isUnitless() {
        return this.exponents.size === 0;
    }

    isEqualTo(unit: Unit) {
        return (
            (this.exponents.size === 0 && unit.isWildcard()) ||
            (this.exponents.size === unit.exponents.size &&
                Array.from(this.exponents.keys()).every(
                    (key) => this.exponents.get(key) === unit.exponents.get(key)
                ))
        );
    }

    computeConflicts() {}

    accepts(unit: Unit): boolean {
        // Every key in this exists in the given unit and they have the same exponents.
        return this.isEqualTo(unit);
    }

    acceptsAll(types: TypeSet): boolean {
        return Array.from(types.set).every(
            (type) => type instanceof Unit && this.accepts(type)
        );
    }

    getNativeTypeName(): NativeTypeName {
        return 'unit';
    }

    toString(depth?: number) {
        const units = Array.from(this.exponents.keys()).sort();
        const numerator = units.filter(
            (unit) => (this.exponents.get(unit) ?? 0) > 0
        );
        const denominator = units.filter(
            (unit) => (this.exponents.get(unit) ?? 0) < 0
        );

        return (
            (depth === undefined ? '' : '\t'.repeat(depth)) +
            numerator
                .map(
                    (unit) =>
                        `${unit}${
                            (this.exponents.get(unit) ?? 0) > 1
                                ? `${EXPONENT_SYMBOL}${this.exponents.get(
                                      unit
                                  )}`
                                : ''
                        }`
                )
                .join(PRODUCT_SYMBOL) +
            (denominator.length > 0 ? LANGUAGE_SYMBOL : '') +
            denominator
                .map(
                    (unit) =>
                        `${unit}${
                            (this.exponents.get(unit) ?? 0) < -1
                                ? `${EXPONENT_SYMBOL}${Math.abs(
                                      this.exponents.get(unit) ?? 0
                                  )}`
                                : ''
                        }`
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
                exponent === 1 ? -(root - 1) : exponent - (root - 1)
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

    getNodeLocale(translation: Locale) {
        return translation.node.Unit;
    }

    getGlyphs() {
        return {
            symbols: this.toWordplay(),
            emotion: Emotion.Kind,
        };
    }

    getDescriptionInputs(locale: Locale) {
        return [
            this.exponents.size === 0
                ? locale.native.measurement.name[0]
                : this.toWordplay(),
        ];
    }
}
