import { getBind } from '@locale/getBind';
import { SHARE_SYMBOL, TYPE_SYMBOL } from '@parser/Symbols';
import type Value from '@values/Value';
import Decimal from 'decimal.js';
import toStructure from '@basis/toStructure';
import { createBasisFunction } from '@basis/Basis';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NameType from '@nodes/NameType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Reference from '@nodes/Reference';
import type StructureDefinition from '@nodes/StructureDefinition';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import { toDecimal } from '@output/Stage';
import Valued, { getOutputInputs } from '@output/Valued';
import { BCTKeys, Focals, type BCTKey } from '@output/BasicColors';

export function createColorType(locales: Locales) {
    // For each Basic Color Term, emit a `↑ <multilingual names>: 🌈(L% C
    // H°)` static bind. `getBind` produces the locale-tagged name list and
    // doc, and the `SHARE_SYMBOL` separator inserts the `↑` between them —
    // the parser's `parseBind` reads `↑` here as the static modifier (since
    // it sits inside a structure block). The value uses `🌈`, the
    // structure's symbolic name, which is in scope inside the block.
    const bcts = BCTKeys.map((key) => {
        const focal = Focals[key];
        const bind = getBind(
            locales,
            (locale) => locale.output.Color.colors[key],
            `${SHARE_SYMBOL} `,
        );
        return `${bind}: 🌈(${focal.l * 100}% ${focal.c} ${focal.h}°)`;
    }).join('\n');

    const colorDef = toStructure(`
    ${getBind(locales, (locale) => locale.output.Color, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Color.lightness)}•%
        ${getBind(locales, (locale) => locale.output.Color.chroma)}•#
        ${getBind(locales, (locale) => locale.output.Color.hue)}•#°
    ) (
        ${bcts}
    )
`);

    // Add a static `random()` function that returns a random Color using the
    // evaluator's recoverable RNG. We build it as a normal basis function (TS
    // body) and then mark it static by giving it a `↑` share token and adding
    // it to the structure's block — `FunctionDefinition.isStatic` recognizes a
    // shared function that's a direct statement of a structure block, making
    // it callable as `Color.random()`.
    // Reference Color by name (not bound to this `colorDef` instance): we
    // inject the function and clone the definition below, so the registered
    // structure ends up being a different instance. A name-resolved type
    // resolves to that registered structure, so argument values (typed
    // against it) match these input/output types. StructureType comparison is
    // by definition identity, so a bound reference to the stale instance would
    // raise a TypeException.
    const colorName = colorDef.getNames()[0];
    const optionalColor = () =>
        UnionType.make(NameType.make(colorName), NoneType.make());
    const randomFun = createBasisFunction(
        locales,
        (locale) => locale.output.Color.random,
        undefined,
        [
            [optionalColor(), NoneLiteral.make()],
            [optionalColor(), NoneLiteral.make()],
        ],
        NameType.make(colorName),
        (requestor: Expression, evaluation: Evaluation) => {
            const evaluator = evaluation.getEvaluator();
            // The registered Color definition (the instance in shares), used
            // to construct the resulting StructureValue.
            const def = evaluator.project.shares.output.Color;
            const a = toColor(evaluation.getInput(0));
            const b = toColor(evaluation.getInput(1));

            let l: number;
            let c: number;
            let h: number;
            if (a === undefined) {
                // No inputs: pick one of the basic colors at random.
                const key =
                    BCTKeys[Math.floor(evaluator.getRandom() * BCTKeys.length)];
                const focal = Focals[key];
                l = focal.l;
                c = focal.c;
                h = focal.h;
            } else if (b === undefined) {
                // One input: keep its lightness and chroma, randomize hue.
                l = a.lightness.toNumber();
                c = a.chroma.toNumber();
                h = evaluator.getRandom() * 360;
            } else {
                // Two inputs: randomize each channel within the range they
                // define (order-independent).
                const between = (x: Decimal, y: Decimal) => {
                    const lo = x.toNumber();
                    const hi = y.toNumber();
                    return lo + evaluator.getRandom() * (hi - lo);
                };
                l = between(a.lightness, b.lightness);
                c = between(a.chroma, b.chroma);
                h = between(a.hue, b.hue);
            }

            // Mirror the BCT staticBuilder's value construction: lightness as
            // a 0–1 decimal, chroma plain, hue in degrees. `getMain()` is the
            // tracking identity for the resulting StructureValue (same as the
            // staticBuilder), since a static call has no instance creator.
            const creator = evaluator.project.getMain();
            return StructureValue.make(
                evaluator,
                creator,
                def,
                new NumberValue(requestor, new Decimal(l)),
                new NumberValue(requestor, new Decimal(c)),
                new NumberValue(requestor, new Decimal(h), Unit.reuse(['°'])),
            );
        },
    );

    // Wrap with a `↑` share token so it reads as static within the block.
    const staticRandom = new FunctionDefinition(
        randomFun.docs,
        new Token(SHARE_SYMBOL, Sym.Share),
        randomFun.fun,
        randomFun.names,
        randomFun.types,
        randomFun.open,
        randomFun.inputs,
        randomFun.close,
        randomFun.dot,
        randomFun.output,
        randomFun.expression,
    );

    // Instance functions `lighter()`/`darker()` that adjust the color's
    // lightness, defaulting to 5%. They reuse the lightness input's own `•%`
    // type so the `by` amount is a percent (e.g. `Color.blue.lighter(10%)`),
    // and read the receiving color through the closure. Lightness is 0–1
    // internally, and a `%` value's `.toNumber()` is already in that scale
    // (so `5%` → 0.05); the result is clamped to [0, 1].
    const lightnessType = colorDef.inputs[0]?.type ?? NumberType.make();
    const adjustLightness =
        (sign: number) =>
        (requestor: Expression, evaluation: Evaluation): Value => {
            const evaluator = evaluation.getEvaluator();
            const def = evaluator.project.shares.output.Color;
            const closure = evaluation.getClosure();
            const color =
                closure instanceof StructureValue ? toColor(closure) : undefined;
            if (color === undefined)
                return evaluation.getValueOrTypeException(
                    requestor,
                    NameType.make(colorName),
                    closure instanceof StructureValue ? closure : undefined,
                );
            const by = evaluation.getInput(0);
            const amount = by instanceof NumberValue ? by.toNumber() : 0.05;
            const newLightness = Math.max(
                0,
                Math.min(1, color.lightness.toNumber() + sign * amount),
            );
            return StructureValue.make(
                evaluator,
                evaluator.project.getMain(),
                def,
                new NumberValue(requestor, new Decimal(newLightness)),
                new NumberValue(requestor, color.chroma),
                new NumberValue(requestor, color.hue, Unit.reuse(['°'])),
            );
        };
    const lighterFun = createBasisFunction(
        locales,
        (locale) => locale.output.Color.lighter,
        undefined,
        [[lightnessType, NumberLiteral.make('5%')]],
        NameType.make(colorName),
        adjustLightness(1),
    );
    const darkerFun = createBasisFunction(
        locales,
        (locale) => locale.output.Color.darker,
        undefined,
        [[lightnessType, NumberLiteral.make('5%')]],
        NameType.make(colorName),
        adjustLightness(-1),
    );

    // Inject the functions into the structure's block, preserving the existing
    // BCT static binds and block formatting. The parsed Color always has a
    // block (the second parenthesized group), so this is defined.
    const oldBlock = colorDef.expression;
    if (oldBlock === undefined)
        throw new Error('Color structure definition is missing its block');
    const block = oldBlock
        .withStatement(staticRandom)
        .withStatement(lighterFun)
        .withStatement(darkerFun);
    const finalDef = colorDef.replace(oldBlock, block);

    // Register a native builder for the BCT static bind values. Color is a
    // basis structure: it's looked up via `Evaluation.resolveDefault`, which
    // wraps the definition in a fresh `StructureDefinitionValue(def)` with
    // an empty statics map and never runs the source-level compile path
    // that would otherwise evaluate `↑ red: 🌈(…)` to populate it.
    // Rather than try to evaluate the BCT value expressions lazily inside
    // a step (which trips the evaluator's "already stepping" guard), we
    // construct each Color `StructureValue` directly from `Focals` — no
    // wordplay evaluation required, just direct value construction.
    finalDef.staticBuilder = (
        evaluator: Evaluator,
        def: StructureDefinition,
    ): Map<Bind, Value> => {
        const map = new Map<Bind, Value>();
        const context = evaluator.project.getContext(
            evaluator.project.getMain(),
        );
        const staticBinds = def.getStaticBindsWithValues(context);
        for (const bind of staticBinds) {
            // The bind's first name is the English BCT key by construction
            // (see `BCTKeys` order in `createColorType` above).
            const firstName = bind.names.getNames()[0];
            const focal = Focals[firstName as BCTKey];
            if (focal === undefined) continue;
            const l = new NumberValue(bind, new Decimal(focal.l));
            const c = new NumberValue(bind, new Decimal(focal.c));
            const h = new NumberValue(
                bind,
                new Decimal(focal.h),
                Unit.reuse(['°']),
            );
            map.set(
                bind,
                StructureValue.make(
                    evaluator,
                    // `creator` is just a tracking identity for the
                    // resulting StructureValue; the project's main source
                    // is a valid EvaluationNode and always available.
                    evaluator.project.getMain(),
                    def,
                    l,
                    c,
                    h,
                ),
            );
        }
        return map;
    };

    return finalDef;
}

export default class Color extends Valued {
    /** 0-1 */
    readonly lightness: Decimal;
    /** 0-∞ */
    readonly chroma: Decimal;
    /** 0-360 */
    readonly hue: Decimal;

    constructor(value: Value, l: Decimal, c: Decimal, h: Decimal) {
        super(value);

        this.lightness = l;
        this.chroma = c;
        this.hue = h;
    }

    contrasting() {
        return new Color(
            this.value,
            new Decimal(this.lightness.greaterThan(0.5) ? 0 : 1),
            new Decimal(this.chroma),
            new Decimal(0),
        );
    }

    hash() {
        return `${this.lightness}${this.chroma}${this.hue}`;
    }

    toCSS() {
        // We should be able to return a direct LCH value, but Safari doesn't handle CSS opacity on LCH colors of symbols well.
        // return opaque === true ? color.to('srgb').toString() : color.display();
        return LCHtoRGB(
            this.lightness.toNumber(),
            this.chroma.toNumber(),
            this.hue.toNumber(),
        );
    }

    equals(color: Color) {
        return (
            this.lightness.equals(color.lightness) &&
            this.chroma.equals(color.chroma) &&
            this.hue.equals(color.hue)
        );
    }
}

export function createColorLiteral(
    project: Project,
    locales: Locales,
    lightness: number,
    chroma: number,
    hue: number,
) {
    const ColorType = project.shares.output.Color;
    return Evaluate.make(
        Reference.make(locales.getName(ColorType.names), ColorType),
        [
            NumberLiteral.make(lightness),
            NumberLiteral.make(chroma),
            NumberLiteral.make(hue, Unit.reuse(['°'])),
        ],
    );
}

export function toColor(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;

    const [lVal, cVal, hVal] = getOutputInputs(value);
    const l = toDecimal(lVal);
    const c = toDecimal(cVal);
    const h = toDecimal(hVal);

    return l && c && h ? new Color(value, l, c, h) : undefined;
}

/** l: 0-1, c: 0-infinity, h=0-360 */
export function LCHtoRGB(l: number, c: number, h: number) {
    return `lch(${l * 100}% ${c} ${h}deg)`;
    // The previous way we converted to rgb prior to LCH support.
    // const color = new ColorJS(ColorJS.spaces.lch, [l * 100, c, h], 1);
    // return color.to('srgb').toString();
}
