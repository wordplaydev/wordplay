import { getBind } from '@locale/getBind';
import { SHARE_SYMBOL, TYPE_SYMBOL } from '@parser/Symbols';
import type Value from '@values/Value';
import Decimal from 'decimal.js';
import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import Reference from '@nodes/Reference';
import type StructureDefinition from '@nodes/StructureDefinition';
import Unit from '@nodes/Unit';
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

    // Register a native builder for the BCT static bind values. Color is a
    // basis structure: it's looked up via `Evaluation.resolveDefault`, which
    // wraps the definition in a fresh `StructureDefinitionValue(def)` with
    // an empty statics map and never runs the source-level compile path
    // that would otherwise evaluate `↑ red: 🌈(…)` to populate it.
    // Rather than try to evaluate the BCT value expressions lazily inside
    // a step (which trips the evaluator's "already stepping" guard), we
    // construct each Color `StructureValue` directly from `Focals` — no
    // wordplay evaluation required, just direct value construction.
    colorDef.staticBuilder = (
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

    return colorDef;
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
