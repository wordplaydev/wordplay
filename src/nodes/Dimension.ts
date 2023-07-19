import Node, { type Concretizer, type Replacement } from './Node';
import Token from './Token';
import { EXPONENT_SYMBOL } from '@parser/Symbols';
import { PRODUCT_SYMBOL } from '@parser/Symbols';
import TokenType from './TokenType';
import NameToken from './NameToken';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type Context from './Context';
import Markup from './Markup';

export default class Dimension extends Node {
    readonly product: Token | undefined;
    readonly name: Token;
    readonly caret: Token | undefined;
    readonly exponent: Token | undefined;

    constructor(
        product: Token | undefined,
        name: Token,
        caret: Token | undefined,
        exponent: Token | undefined
    ) {
        super();

        this.product = product;
        this.name = name;
        this.caret =
            exponent !== undefined && caret === undefined
                ? new Token(EXPONENT_SYMBOL, TokenType.Operator)
                : caret;
        this.exponent = exponent === undefined ? undefined : exponent;

        this.computeChildren();
    }

    static make(subsequent: boolean, unit: string, exponent: number) {
        return new Dimension(
            subsequent
                ? new Token(PRODUCT_SYMBOL, TokenType.Operator)
                : undefined,
            new NameToken(unit),
            exponent > 1
                ? new Token(EXPONENT_SYMBOL, TokenType.Operator)
                : undefined,
            exponent > 1
                ? new Token('' + exponent, TokenType.Number)
                : undefined
        );
    }

    getGrammar() {
        return [
            { name: 'product', types: [TokenType.Operator, undefined] },
            { name: 'name', types: [TokenType.Name] },
            { name: 'caret', types: [TokenType.Operator, 'exponent'] },
            { name: 'exponent', types: [TokenType.Number, 'caret'] },
        ];
    }

    clone(replace?: Replacement) {
        return new Dimension(
            this.replaceChild('product', this.product, replace),
            this.replaceChild('name', this.name, replace),
            this.replaceChild('caret', this.caret, replace),
            this.replaceChild('exponent', this.exponent, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Bind;
    }

    getName() {
        return this.name.getText();
    }

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.Dimension;
    }

    getDescription(_: Concretizer, locale: Locale, __: Context) {
        const dim = this.getName();
        return Markup.words(
            {
                pm: 'picometers',
                nm: 'nanometers',
                µm: 'micrometers',
                mm: 'millimeters',
                m: 'meters',
                cm: 'centimeters',
                dm: 'decimeters',
                km: 'kilometers',
                Mm: 'megameters',
                Gm: 'gigameters',
                Tm: 'terameters',
                mi: 'miles',
                in: 'inches',
                ft: 'feet',
                ms: 'milliseconds',
                s: 'seconds',
                min: 'minutes',
                hr: 'hours',
                day: 'days',
                wk: 'weeks',
                yr: 'years',
                g: 'grams',
                mg: 'milligrams',
                kg: 'kilograms',
                oz: 'ounces',
                lb: 'pounds',
                pt: 'font size',
            }[dim] ?? locale.node.Dimension.description
        );
    }

    getGlyphs() {
        return Glyphs.Dimension;
    }
}
