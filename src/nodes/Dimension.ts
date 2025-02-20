import type EditContext from '@edit/EditContext';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { EXPONENT_SYMBOL, PRODUCT_SYMBOL } from '@parser/Symbols';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Markup from './Markup';
import NameToken from './NameToken';
import Node, { any, node, none, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';

export default class Dimension extends Node {
    readonly product: Token | undefined;
    readonly name: Token | undefined;
    readonly caret: Token | undefined;
    readonly exponent: Token | undefined;

    constructor(
        product: Token | undefined,
        name: Token | undefined,
        caret: Token | undefined,
        exponent: Token | undefined,
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
            exponent > 1 ? new Token('' + exponent, Sym.Number) : undefined,
        );
    }

    static getPossibleReplacements({ node, type }: EditContext) {
        return node instanceof Dimension && type === undefined
            ? [
                  // A power of two
                  ...(node.exponent === undefined ? [node.withPower(2)] : []),
              ]
            : [];
    }

    static getPossibleAppends() {
        return [];
    }

    getDescriptor(): NodeDescriptor {
        return 'Dimension';
    }

    getGrammar(): Grammar {
        return [
            { name: 'product', kind: any(node(Sym.Operator), none()) },
            { name: 'name', kind: node(Sym.Name), uncompletable: true },
            {
                name: 'caret',
                kind: any(
                    node(Sym.Operator),
                    none(['exponent', () => new Token('1', Sym.Number)]),
                ),
            },
            {
                name: 'exponent',
                kind: any(
                    node(Sym.Number),
                    none([
                        'caret',
                        () => new Token(EXPONENT_SYMBOL, Sym.Operator),
                    ]),
                ),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Dimension(
            this.replaceChild('product', this.product, replace),
            this.replaceChild('name', this.name, replace),
            this.replaceChild('caret', this.caret, replace),
            this.replaceChild('exponent', this.exponent, replace),
        ) as this;
    }

    asProduct() {
        return this.product !== undefined
            ? this
            : new Dimension(
                  new Token(PRODUCT_SYMBOL, Sym.Operator),
                  this.name?.clone(),
                  this.caret,
                  this.exponent,
              );
    }

    asPower() {
        return this.caret !== undefined
            ? this
            : new Dimension(
                  this.product,
                  this.name,
                  new Token(EXPONENT_SYMBOL, Sym.Operator),
                  this.exponent,
              );
    }

    withPower(power: number) {
        return this.caret !== undefined
            ? this
            : new Dimension(
                  this.product,
                  this.name,
                  new Token(EXPONENT_SYMBOL, Sym.Operator),
                  new Token(power.toString(), [Sym.Number, Sym.Decimal]),
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
        return [];
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Dimension);
    }

    getDescription(locales: Locales) {
        const dim = this.getName();

        return Markup.words(
            dim === undefined
                ? ''
                : ({
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
                  }[dim] ?? locales.get((l) => l.node.Dimension.description)),
        );
    }

    getCharacter() {
        return Characters.Dimension;
    }
}
