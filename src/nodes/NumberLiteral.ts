import { Purpose } from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import { NotANumber } from '@conflicts/NotANumber';
import { getPossibleDimensions } from '@edit/menu/getPossibleUnits';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import NumberValue from '@values/NumberValue';
import Decimal from 'decimal.js';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Context from '@nodes/Context';
import Dimension from '@nodes/Dimension';
import Literal from '@nodes/Literal';
import type Node from '@nodes/Node';
import { node, optional, type Grammar, type Replacement } from '@nodes/Node';
import NumberType from '@nodes/NumberType';
import {
    NumeralSyms,
    numeralDigits,
    renderBase,
    renderNumeral,
} from '@values/numerals';
import { Sym, type SymType } from '@nodes/Sym';
import { NOT_A_NUMBER_SYMBOL } from '@parser/Symbols';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import Unit from '@nodes/Unit';

export default class NumberLiteral extends Literal {
    readonly number: Token;
    readonly unit: Unit | undefined;

    #numberCache: Decimal | undefined;
    #precisionCache: number | undefined;

    constructor(number: Token, unit?: Unit) {
        super();

        this.number = number;
        this.unit = unit;

        this.computeChildren();
    }

    static make(number?: number | string, unit?: Unit, type?: SymType) {
        return new NumberLiteral(
            new Token(
                // No number means not-a-number, which is written `!#`. The JS
                // string "NaN" would re-lex as a name, not a number.
                number === undefined
                    ? NOT_A_NUMBER_SYMBOL
                    : typeof number === 'number'
                      ? '' + number
                      : number,
                [
                    Sym.Number,
                    ...(type
                        ? [type]
                        : number === undefined
                          ? [Sym.NotANumber]
                          : []),
                ],
            ),
            unit === undefined ? Unit.Empty : unit,
        );
    }

    /**
     * The value written in every numeral system that can represent it exactly, carrying the
     * given unit. These are the hardest literals in the language to type — a creator has no
     * keyboard for Ⅴ or 五 — so the menu is realistically the only way to reach them.
     */
    static getPossibleNumerals(value: Decimal, unit: Unit | undefined) {
        return [
            ...NumeralSyms.map((sym) => {
                const text = renderNumeral(value, sym);
                return text === undefined
                    ? undefined
                    : NumberLiteral.make(text, unit?.clone(), sym);
            }),
            // Two bases, rather than all fifteen: enough to show the form exists.
            ...[2, 16].map((base) => {
                const text = renderBase(value, base);
                return text === undefined
                    ? undefined
                    : NumberLiteral.make(text, unit?.clone(), Sym.Base);
            }),
        ].filter((literal): literal is NumberLiteral => literal !== undefined);
    }

    /**
     * Every single numeral glyph, as a literal, so each is reachable in one step. A creator has
     * no keyboard for Ⅴ or ๗, which makes the menu the only practical way to write them.
     */
    static getPossibleDigits(unit: Unit | undefined) {
        return [
            // Arabic first: it's what most creators are typing anyway.
            ...Array.from({ length: 10 }, (_, digit) =>
                NumberLiteral.make(digit, unit?.clone()),
            ),
            ...NumeralSyms.map((sym) =>
                numeralDigits(sym).map((text) =>
                    NumberLiteral.make(text, unit?.clone(), sym),
                ),
            ).flat(),
        ];
    }

    /** The numeral system this literal is written in, if it isn't decimal. */
    getNumeralSym(): SymType | undefined {
        return NumeralSyms.find((sym) => this.number.isSymbol(sym));
    }

    /**
     * This literal with one of its own system's digits inserted at every position — before it,
     * inside it, and after it. Assembling a numeral a glyph at a time is the whole point: with
     * no keyboard for Ⅰ or ๗, `Ⅴ` becomes `ⅤⅠ` only if the menu can put a digit next to one
     * that's already there. Roman and Han are included, since Roman is exactly the case a
     * creator hits first.
     *
     * A candidate that doesn't read back as a number is dropped, which is what keeps a glyph
     * that means something else in the middle of a word (a Han place marker in a spot that
     * makes the number unreadable) out of the menu.
     */
    getPossibleDigitInsertions(at?: number): NumberLiteral[] {
        const sym = this.getNumeralSym();
        const text = this.number.getText();
        // A caret says where the creator means to add a glyph, so offer only that spot; without
        // one (the whole literal is selected) offer every spot.
        if (at !== undefined && (at < 0 || at > text.length)) return [];
        // Base literals carry their base in the same token (`16;FF`), so splicing a digit in
        // can corrupt the prefix rather than build a number. Left alone.
        if (this.number.isSymbol(Sym.Base) || text.includes(';')) return [];
        const digits =
            sym === undefined
                ? Array.from({ length: 10 }, (_, digit) => String(digit))
                : numeralDigits(sym);
        const seen = new Set<string>([text]);
        const insertions: NumberLiteral[] = [];
        const first = at ?? 0;
        const last = at ?? text.length;
        for (let position = first; position <= last; position++)
            for (const digit of digits) {
                const candidate =
                    text.slice(0, position) + digit + text.slice(position);
                if (seen.has(candidate)) continue;
                seen.add(candidate);
                const literal = NumberLiteral.make(
                    candidate,
                    this.unit?.clone(),
                    sym,
                );
                if (!literal.getValue().num.isNaN()) insertions.push(literal);
            }
        return insertions;
    }

    /** Given a type and source context,  */
    static getPossibleNumbers(
        node: Node | undefined,
        type: Type | undefined,
        context: Context,
    ) {
        // What number types are possible?
        const possibleNumberTypes = type
            ?.getPossibleTypes(context)
            .filter(
                (possibleType): possibleType is NumberType =>
                    possibleType instanceof NumberType,
            );

        // If a type is provided, and it has a unit, suggest numbers with corresponding units.
        if (possibleNumberTypes && possibleNumberTypes.length > 0) {
            return possibleNumberTypes
                .map((numberType) => {
                    const unit =
                        numberType.unit instanceof Unit
                            ? numberType.unit.clone()
                            : undefined;
                    const literal = numberType.isLiteral()
                        ? numberType.getLiteral()
                        : node instanceof NumberLiteral
                          ? node.withUnit(unit)
                          : NumberLiteral.make(1, unit);
                    return [
                        literal,
                        // The same value written in every other numeral system.
                        ...NumberLiteral.getPossibleNumerals(
                            literal.getValue().num,
                            unit,
                        ),
                        // With a literal already here, assembling it is the useful offer; the
                        // whole glyph palette is for starting a number, not extending one.
                        ...(node instanceof NumberLiteral
                            ? node.getPossibleDigitInsertions()
                            : NumberLiteral.getPossibleDigits(unit)),
                    ];
                })
                .flat();
        }
        // No type provided, but there's a node? Suggest numbers with all possible units,
        // and the same value written in every numeral system.
        else if (node instanceof NumberLiteral) {
            return [
                ...getPossibleDimensions(context).map((dimension) =>
                    NumberLiteral.make(
                        node.number.getText(),
                        new Unit(undefined, [
                            Dimension.make(false, dimension, 1),
                        ]),
                    ),
                ),
                ...NumberLiteral.getPossibleNumerals(
                    node.getValue().num,
                    node.unit === undefined || node.unit.isUnitless()
                        ? undefined
                        : node.unit,
                ),
                // How ๑ becomes ๑๒, and Ⅴ becomes ⅤⅠ, when there's no keyboard for the script.
                ...node.getPossibleDigitInsertions(),
            ];
        }
        // No type? Suggest some common numbers and hard to type numbers.
        else
            return [
                NumberLiteral.make(0, undefined, Sym.Decimal),
                NumberLiteral.make('π', undefined, Sym.Pi),
                NumberLiteral.make('∞', undefined, Sym.Infinity),
                NumberLiteral.make(
                    NOT_A_NUMBER_SYMBOL,
                    undefined,
                    Sym.NotANumber,
                ),
                ...NumberLiteral.getPossibleDigits(undefined),
            ];
    }

    /** Replacing a node with another? Get numbers that match the expected type. */
    static getPossibleReplacements({ node, type, context }: ReplaceContext) {
        return NumberLiteral.getPossibleNumbers(node, type, context);
    }

    /** Inserting a number in a list? Get numbers that match the expected type. */
    static getPossibleInsertions({ type, context }: InsertContext) {
        return NumberLiteral.getPossibleNumbers(undefined, type, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'NumberLiteral';
    }

    getPurpose() {
        return Purpose.Numbers;
    }

    isPercent() {
        return this.number.getText().endsWith('%');
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'number',
                kind: node(Sym.Number),
                uncompletable: true,
                label: undefined,
            },
            {
                name: 'unit',
                kind: optional(node(Unit)),
                label: () => (l) => l.node.Unit.name,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new NumberLiteral(
            this.replaceChild('number', this.number, replace),
            this.replaceChild('unit', this.unit, replace),
        ) as this;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'measurement';
    }

    isInteger() {
        return !isNaN(parseInt(this.number.text.toString()));
    }

    computeConflicts(): Conflict[] {
        // `!#` says not-a-number on purpose. The conflict is for a number we
        // couldn't read at all, like base 2 with a digit 9.
        if (this.number.isSymbol(Sym.NotANumber)) return [];
        if (this.getValue().num.isNaN()) return [new NotANumber(this)];
        else return [];
    }

    computeType(): Type {
        return new NumberType(this.number, this.unit);
    }

    withUnit(unit: Unit | undefined) {
        return new NumberLiteral(this.number.clone(), unit);
    }

    isProvablyNonZero(): boolean {
        return !this.getValue().num.isZero();
    }

    getValue() {
        if (this.#numberCache)
            return new NumberValue(
                this,
                this.#numberCache,
                this.unit,
                this.#precisionCache,
            );
        else {
            const value = new NumberValue(this, this.number, this.unit);
            this.#numberCache = value.num;
            this.#precisionCache = value.precision;
            return value;
        }
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.number;
    }
    getFinish() {
        return this.number;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.NumberLiteral;
    getLocalePath() {
        return NumberLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.NumberLiteral.start, {
            value: new NodeRef(this.number, locales, context),
        });
    }

    getCharacter() {
        return Characters.Number;
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            number: this.number.getText(),
            // The unit's code text, not its description: "number 5 m", not
            // "number 5 unit m".
            unit:
                this.unit && !this.unit.isUnitless()
                    ? this.unit.toWordplay()
                    : undefined,
        };
    }

    adjust(direction: -1 | 1): this | undefined {
        const value = this.getValue().num;

        // There is no next not-a-number, and stepping one used to write the
        // literal "NaN", which isn't a number literal at all.
        if (value.isNaN()) return undefined;

        const isPercent = this.isPercent();
        const amount = this.isPercent() ? 0.01 : 1;

        return value
            ? (NumberLiteral.make(
                  value
                      .plus(direction * amount)
                      .times(isPercent ? 100 : 1)
                      .toString() + (isPercent ? '%' : ''),
                  this.unit,
              ) as this)
            : undefined;
    }
}
