import { getPossibleDimensions } from '@edit/menu/getPossibleUnits';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { DOT_SYMBOL, EXPONENT_SYMBOL } from '@parser/Symbols';
import { Purpose } from '@concepts/Purpose';
import type Context from '@nodes/Context';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import Markup from '@nodes/Markup';
import NameToken from '@nodes/NameToken';
import Node, { any, node, none, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

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
            subsequent ? new Token(DOT_SYMBOL, Sym.Operator) : undefined,
            new NameToken(unit),
            exponent > 1 ? new Token(EXPONENT_SYMBOL, Sym.Operator) : undefined,
            exponent > 1 ? new Token('' + exponent, Sym.Number) : undefined,
        );
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        return node instanceof Dimension
            ? [
                  // Wrap in a power of two if there isn't one already —
                  // listed first because adding an exponent to the same
                  // dimension is usually a more relevant edit than swapping
                  // the unit entirely.
                  ...(node.exponent === undefined ? [node.withPower(2)] : []),
                  // Other dimensions, preserving this dimension's structure.
                  ...node.getAlternativeDimensions(context),
              ]
            : getPossibleDimensions(context).map((dim) =>
                  Dimension.make(false, dim, -1),
              );
    }

    static getPossibleInsertions({ context, index }: InsertContext) {
        const dimensions = getPossibleDimensions(context);
        return [
            ...dimensions.map((dim) =>
                Dimension.make(index !== undefined && index > 0, dim, 1),
            ),
            ...dimensions.map((dim) =>
                Dimension.make(index !== undefined && index > 0, dim, -1),
            ),
        ];
    }

    /** A Dimension is just product + name + caret + exponent (all tokens), so
     *  selecting any of them should swap to a different dimension while
     *  preserving structure (leading product op and exponent). */
    getReplacementsForTokenAnchor(context: Context): Dimension[] {
        return this.getAlternativeDimensions(context);
    }

    /** Other dimensions in scope, with this dimension's surrounding tokens
     *  preserved. Shared by getReplacementsForTokenAnchor (token-anchor
     *  case) and getPossibleReplacements (Dimension-anchor case, reached
     *  either by direct selection or single-child walk-up from the name
     *  token). */
    getAlternativeDimensions(context: Context): Dimension[] {
        const current = this.getName();
        return getPossibleDimensions(context)
            .filter((dim) => dim !== current)
            .map(
                (dim) =>
                    new Dimension(
                        this.product,
                        new NameToken(dim),
                        this.caret,
                        this.exponent,
                    ),
            );
    }

    getDescriptor(): NodeDescriptor {
        return 'Dimension';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'product',
                kind: any(node(Sym.Operator), none()),
                label: undefined,
            },
            {
                name: 'name',
                kind: node(Sym.Name),
                uncompletable: true,
                label: undefined,
            },
            {
                name: 'caret',
                kind: any(
                    node(Sym.Operator),
                    none(['exponent', () => new Token('1', Sym.Number)]),
                ),
                label: undefined,
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
                label: undefined,
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
                  new Token(DOT_SYMBOL, Sym.Operator),
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
        return Purpose.Numbers;
    }

    getName() {
        return this.name?.getText();
    }

    computeConflicts() {
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Dimension;
    getLocalePath() {
        return Dimension.LocalePath;
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
                  }[dim] ??
                      locales.getUnannotatedText(
                          (l) => l.node.Dimension.description,
                      )),
        );
    }

    getCharacter() {
        return Characters.Dimension;
    }
}
