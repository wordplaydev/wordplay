import Node, { none, type Replacement, node, any, type Grammar } from './Node';
import type Concretizer from './Concretizer';
import Token from './Token';
import { EXPONENT_SYMBOL } from '@parser/Symbols';
import { PRODUCT_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import NameToken from './NameToken';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Markup from './Markup';
import type Type from './Type';
import type Locales from '../locale/Locales';

export default class Dimension extends Node {
    readonly product: Token | undefined;
    readonly name: Token | undefined;
    readonly caret: Token | undefined;
    readonly exponent: Token | undefined;

    constructor(
        product: Token | undefined,
        name: Token | undefined,
        caret: Token | undefined,
        exponent: Token | undefined
    ) {
        super();

        this.product = product;
        this.name = name;
        this.caret =
            exponent !== undefined && caret === undefined
                ? new Token(EXPONENT_SYMBOL, Sym.Operator)
                : caret;
        this.exponent = exponent === undefined ? undefined : exponent;

        this.computeChildren();
    }

    static make(subsequent: boolean, unit: string, exponent: number) {
        return new Dimension(
            subsequent ? new Token(PRODUCT_SYMBOL, Sym.Operator) : undefined,
            new NameToken(unit),
            exponent > 1 ? new Token(EXPONENT_SYMBOL, Sym.Operator) : undefined,
            exponent > 1 ? new Token('' + exponent, Sym.Number) : undefined
        );
    }

    static getPossibleNodes(
        type: Type | undefined,
        anchor: Node,
        selected: boolean
    ): Dimension[] {
        // If we've selected this anchor for replacement, offer to replace it with...
        if (anchor && selected && anchor instanceof Dimension) {
            return [
                // An empty exponent, if it doesn't have one
                ...(anchor.caret === undefined ? [anchor.asPower()] : []),
                // A power of two
                ...(anchor.exponent === undefined ? [anchor.withPower(2)] : []),
            ];
        }

        return [];
    }

    getDescriptor() {
        return 'Dimension';
    }

    getGrammar(): Grammar {
        return [
            { name: 'product', kind: any(node(Sym.Operator), none()) },
            { name: 'name', kind: node(Sym.Name), uncompletable: true },
            {
                name: 'caret',
                kind: any(node(Sym.Operator), none('exponent')),
            },
            {
                name: 'exponent',
                kind: any(node(Sym.Number), none('caret')),
            },
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

    asProduct() {
        return this.product !== undefined
            ? this
            : new Dimension(
                  new Token(PRODUCT_SYMBOL, Sym.Operator),
                  this.name?.clone(),
                  this.caret,
                  this.exponent
              );
    }

    asPower() {
        return this.caret !== undefined
            ? this
            : new Dimension(
                  this.product,
                  this.name,
                  new Token(EXPONENT_SYMBOL, Sym.Operator),
                  this.exponent
              );
    }

    withPower(power: number) {
        return this.caret !== undefined
            ? this
            : new Dimension(
                  this.product,
                  this.name,
                  new Token(EXPONENT_SYMBOL, Sym.Operator),
                  new Token(power.toString(), [Sym.Number, Sym.Decimal])
              );
    }

    hasDimension(name: string) {
        return this.name?.getText() === name;
    }

    getPurpose() {
        return Purpose.Type;
    }

    getName() {
        return this.name?.getText();
    }

    computeConflicts() {
        return;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Dimension);
    }

    getDescription(_: Concretizer, locales: Locales) {
        const dim = this.getName();

        return Markup.words(
            dim === undefined
                ? ''
                : {
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
                  }[dim] ?? locales.get((l) => l.node.Dimension.description)
        );
    }

    getGlyphs() {
        return Glyphs.Dimension;
    }
}
