import { createBasisConversion } from '@basis/Basis';
import { getTemplatedDocLocales } from '@locale/getDocLocales';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import selectTranslation from '@locale/selectTranslation';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Docs from '@nodes/Docs';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Expression from '@nodes/Expression';
import NumberType from '@nodes/NumberType';
import Unit from '@nodes/Unit';
import NumberValue from '@values/NumberValue';
import type Value from '@values/Value';
import Decimal from 'decimal.js';

/**
 * Every built-in unit conversion, as data rather than code.
 *
 * Two things motivated the table. Hand-written conversion blocks hid arithmetic
 * errors — the design proposal for #363 shipped three (a horsepower that was
 * 445.7 W in the formula and 745.7 W in the prose, a calorie equal to one joule,
 * an imperial gallon paired with an imperial fluid ounce in an otherwise US set)
 * — and a table makes every factor reviewable side by side and testable in bulk.
 * And each conversion needed its own translated sentence, which does not scale to
 * two hundred of them; a unit's name is translated once here instead.
 */

/** An exact quantity. `Decimal` is for factors a float can't hold, like π. */
type Amount = number | Decimal;

/**
 * A unit's dimensions. Repeats become exponents, so `['m', 'm']` is `m^2`, and
 * `denominator` gives quotients like `m/s`.
 */
type UnitDefinition = {
    numerator: string[];
    denominator?: string[];
};

/**
 * A unit's size relative to its dimension's hub unit: `of` of this unit equals
 * `is` of the hub. A ratio rather than a single factor so reciprocals stay exact
 * — 3.6 km/h is exactly 1 m/s, while 1 km/h is 0.2777… m/s.
 */
type Ratio = { of: Amount; is: Amount };

/** A spoke's ratio; a bare amount means one of this unit equals that many hub units. */
type Size = Amount | Ratio;

/**
 * One dimension: a hub unit, and every other unit given relative to it. Conversions
 * are generated hub↔spoke only; `Convert` searches the conversion graph for a path,
 * so `1km → #mi` composes through meters without a direct edge.
 */
type Dimension = {
    /** The key of the unit every other unit in this dimension is measured against. */
    hub: UnitKey;
    /** Every other unit, keyed by unit key. */
    spokes: Partial<Record<UnitKey, Size>>;
};

/**
 * A conversion that shifts as well as scales: `to = from × factor + offset`.
 * Temperature is the only one, and no scaled temperature units (millikelvin and
 * such) are defined, so an offset can never be compounded with a prefix.
 */
type AffineConversion = {
    from: UnitKey;
    to: UnitKey;
    factor: Amount;
    offset: Amount;
};

/**
 * Every unit, keyed by a name that is a valid TypeScript identifier and a valid
 * locale JSON key. The key is deliberately not the symbol: `°C`, `µm`, `Ω`, `m^2`,
 * and `mi/h` are all fine as Wordplay dimension names but not as property names.
 */
export const Units = {
    // Time
    ns: { numerator: ['ns'] },
    us: { numerator: ['µs'] },
    ms: { numerator: ['ms'] },
    s: { numerator: ['s'] },
    min: { numerator: ['min'] },
    h: { numerator: ['h'] },
    day: { numerator: ['day'] },
    wk: { numerator: ['wk'] },
    yr: { numerator: ['yr'] },

    // Length
    pm: { numerator: ['pm'] },
    nm: { numerator: ['nm'] },
    um: { numerator: ['µm'] },
    mm: { numerator: ['mm'] },
    cm: { numerator: ['cm'] },
    dm: { numerator: ['dm'] },
    m: { numerator: ['m'] },
    hm: { numerator: ['hm'] },
    km: { numerator: ['km'] },
    Mm: { numerator: ['Mm'] },
    Gm: { numerator: ['Gm'] },
    Tm: { numerator: ['Tm'] },
    in: { numerator: ['in'] },
    ft: { numerator: ['ft'] },
    yd: { numerator: ['yd'] },
    mi: { numerator: ['mi'] },
    nmi: { numerator: ['nmi'] },
    au: { numerator: ['au'] },
    ly: { numerator: ['ly'] },

    // Mass
    ug: { numerator: ['µg'] },
    mg: { numerator: ['mg'] },
    g: { numerator: ['g'] },
    kg: { numerator: ['kg'] },
    t: { numerator: ['t'] },
    oz: { numerator: ['oz'] },
    lb: { numerator: ['lb'] },
    st: { numerator: ['st'] },
    uston: { numerator: ['uston'] },
    ukton: { numerator: ['ukton'] },

    // Temperature
    degC: { numerator: ['°C'] },
    degF: { numerator: ['°F'] },
    K: { numerator: ['K'] },

    // Angle
    deg: { numerator: ['°'] },
    rad: { numerator: ['rad'] },

    // Area
    mm2: { numerator: ['mm', 'mm'] },
    cm2: { numerator: ['cm', 'cm'] },
    m2: { numerator: ['m', 'm'] },
    km2: { numerator: ['km', 'km'] },
    in2: { numerator: ['in', 'in'] },
    ft2: { numerator: ['ft', 'ft'] },
    yd2: { numerator: ['yd', 'yd'] },
    mi2: { numerator: ['mi', 'mi'] },
    ha: { numerator: ['ha'] },
    acre: { numerator: ['acre'] },

    // Volume
    mL: { numerator: ['mL'] },
    cL: { numerator: ['cL'] },
    dL: { numerator: ['dL'] },
    L: { numerator: ['L'] },
    kL: { numerator: ['kL'] },
    cm3: { numerator: ['cm', 'cm', 'cm'] },
    m3: { numerator: ['m', 'm', 'm'] },
    tsp: { numerator: ['tsp'] },
    tbsp: { numerator: ['tbsp'] },
    cup: { numerator: ['cup'] },
    usfloz: { numerator: ['usfloz'] },
    uspt: { numerator: ['uspt'] },
    usqt: { numerator: ['usqt'] },
    usgal: { numerator: ['usgal'] },
    ukfloz: { numerator: ['ukfloz'] },
    ukpt: { numerator: ['ukpt'] },
    ukqt: { numerator: ['ukqt'] },
    ukgal: { numerator: ['ukgal'] },

    // Speed
    mps: { numerator: ['m'], denominator: ['s'] },
    kmph: { numerator: ['km'], denominator: ['h'] },
    miph: { numerator: ['mi'], denominator: ['h'] },
    ftps: { numerator: ['ft'], denominator: ['s'] },
    kn: { numerator: ['kn'] },

    // Pressure
    Pa: { numerator: ['Pa'] },
    hPa: { numerator: ['hPa'] },
    kPa: { numerator: ['kPa'] },
    bar: { numerator: ['bar'] },
    atm: { numerator: ['atm'] },
    psi: { numerator: ['psi'] },
    mmHg: { numerator: ['mmHg'] },

    // Energy
    J: { numerator: ['J'] },
    kJ: { numerator: ['kJ'] },
    cal: { numerator: ['cal'] },
    kcal: { numerator: ['kcal'] },
    Wh: { numerator: ['Wh'] },
    kWh: { numerator: ['kWh'] },
    BTU: { numerator: ['BTU'] },
    eV: { numerator: ['eV'] },

    // Power
    mW: { numerator: ['mW'] },
    W: { numerator: ['W'] },
    kW: { numerator: ['kW'] },
    MW: { numerator: ['MW'] },
    GW: { numerator: ['GW'] },
    hp: { numerator: ['hp'] },

    // Current
    uA: { numerator: ['µA'] },
    mA: { numerator: ['mA'] },
    A: { numerator: ['A'] },
    kA: { numerator: ['kA'] },

    // Voltage
    mV: { numerator: ['mV'] },
    V: { numerator: ['V'] },
    kV: { numerator: ['kV'] },

    // Resistance
    mohm: { numerator: ['mΩ'] },
    ohm: { numerator: ['Ω'] },
    kohm: { numerator: ['kΩ'] },
    Mohm: { numerator: ['MΩ'] },

    // Frequency
    Hz: { numerator: ['Hz'] },
    kHz: { numerator: ['kHz'] },
    MHz: { numerator: ['MHz'] },
    GHz: { numerator: ['GHz'] },
    bpm: { numerator: ['bpm'] },

    // Data
    bit: { numerator: ['b'] },
    B: { numerator: ['B'] },
    kB: { numerator: ['kB'] },
    MB: { numerator: ['MB'] },
    GB: { numerator: ['GB'] },
    TB: { numerator: ['TB'] },
    KiB: { numerator: ['KiB'] },
    MiB: { numerator: ['MiB'] },
    GiB: { numerator: ['GiB'] },
    TiB: { numerator: ['TiB'] },

    // Illuminance
    lux: { numerator: ['lux'] },
    fc: { numerator: ['fc'] },
} as const satisfies Record<string, UnitDefinition>;

export type UnitKey = keyof typeof Units;

/**
 * Which kind of measurement each unit measures, mirroring the comment blocks in `Units` above.
 * The edit menu groups its unit suggestions by these, so a creator looking for `km` reads a
 * short list of lengths instead of scrolling all 126 units.
 *
 * Deliberately not derived from `Dimensions` below: temperature's entry there has no spokes
 * (°F and K are affine, declared separately), so `degF` and `K` would belong to nothing, and
 * electricity is three dimensions there where it reads as one idea here.
 *
 * `UnitConversions.test.ts` asserts every `UnitKey` appears in exactly one category, which is
 * what keeps this and the table from drifting apart.
 */
export const UnitCategories = {
    time: ['ns', 'us', 'ms', 's', 'min', 'h', 'day', 'wk', 'yr'],
    length: [
        'pm',
        'nm',
        'um',
        'mm',
        'cm',
        'dm',
        'm',
        'hm',
        'km',
        'Mm',
        'Gm',
        'Tm',
        'in',
        'ft',
        'yd',
        'mi',
        'nmi',
        'au',
        'ly',
    ],
    weight: ['ug', 'mg', 'g', 'kg', 't', 'oz', 'lb', 'st', 'uston', 'ukton'],
    temperature: ['degC', 'degF', 'K'],
    angle: ['deg', 'rad'],
    area: ['mm2', 'cm2', 'm2', 'km2', 'in2', 'ft2', 'yd2', 'mi2', 'ha', 'acre'],
    volume: [
        'mL',
        'cL',
        'dL',
        'L',
        'kL',
        'cm3',
        'm3',
        'tsp',
        'tbsp',
        'cup',
        'usfloz',
        'uspt',
        'usqt',
        'usgal',
        'ukfloz',
        'ukpt',
        'ukqt',
        'ukgal',
    ],
    speed: ['mps', 'kmph', 'miph', 'ftps', 'kn'],
    pressure: ['Pa', 'hPa', 'kPa', 'bar', 'atm', 'psi', 'mmHg'],
    energy: ['J', 'kJ', 'cal', 'kcal', 'Wh', 'kWh', 'BTU', 'eV'],
    power: ['mW', 'W', 'kW', 'MW', 'GW', 'hp'],
    electricity: [
        'uA',
        'mA',
        'A',
        'kA',
        'mV',
        'V',
        'kV',
        'mohm',
        'ohm',
        'kohm',
        'Mohm',
    ],
    frequency: ['Hz', 'kHz', 'MHz', 'GHz', 'bpm'],
    data: ['bit', 'B', 'kB', 'MB', 'GB', 'TB', 'KiB', 'MiB', 'GiB', 'TiB'],
    brightness: ['lux', 'fc'],
} as const satisfies Record<string, readonly UnitKey[]>;

export type UnitCategory = keyof typeof UnitCategories;

/** The kind of measurement a unit measures. Every key in `Units` has one. */
export function getUnitCategory(key: UnitKey): UnitCategory | undefined {
    return (Object.keys(UnitCategories) as UnitCategory[]).find((category) =>
        (UnitCategories[category] as readonly UnitKey[]).includes(key),
    );
}

/** π to Decimal's precision; `Decimal` has no π constant, but arccos(−1) is exact to it. */
const Pi = Decimal.acos(-1);

/**
 * Every dimension, hub first. Sources: SI brochure (9th ed.) for the metric units,
 * NIST SP 811 Appendix B for the US customary and imperial factors, and the UK
 * Weights and Measures Act for the imperial volumes. Factors are exact where the
 * definition is exact, which is most of them.
 */
export const Dimensions: Dimension[] = [
    {
        hub: 's',
        spokes: {
            ns: 1e-9,
            us: 1e-6,
            ms: 1e-3,
            min: 60,
            h: 3600,
            day: 86400,
            wk: 604800,
            // The Julian year, 365.25 days. This was 31449600 (52 weeks, i.e. 364
            // days) until #363, which is not any definition of a year.
            yr: 31557600,
        },
    },
    {
        hub: 'm',
        spokes: {
            pm: 1e-12,
            nm: 1e-9,
            um: 1e-6,
            mm: 1e-3,
            cm: 1e-2,
            dm: 1e-1,
            hm: 100,
            km: 1e3,
            Mm: 1e6,
            Gm: 1e9,
            Tm: 1e12,
            in: 0.0254,
            ft: 0.3048,
            yd: 0.9144,
            mi: 1609.344,
            nmi: 1852,
            au: 149597870700,
            ly: new Decimal('9460730472580800'),
        },
    },
    {
        hub: 'g',
        spokes: {
            ug: 1e-6,
            mg: 1e-3,
            kg: 1e3,
            t: 1e6,
            oz: 28.349523125,
            lb: 453.59237,
            // 14 pounds.
            st: 6350.29318,
            // The short ton, 2000 pounds; the long ton, 2240 pounds.
            uston: 907184.74,
            ukton: 1016046.9088,
        },
    },
    {
        // Kelvin and Fahrenheit are affine, not scaled, so they are in
        // AffineConversions below rather than here.
        hub: 'degC',
        spokes: {},
    },
    {
        hub: 'deg',
        // π radians is 180 degrees.
        spokes: { rad: { of: Pi, is: 180 } },
    },
    {
        hub: 'm2',
        spokes: {
            mm2: 1e-6,
            cm2: 1e-4,
            km2: 1e6,
            in2: 0.00064516,
            ft2: 0.09290304,
            yd2: 0.83612736,
            mi2: 2589988.110336,
            ha: 1e4,
            acre: 4046.8564224,
        },
    },
    {
        hub: 'L',
        spokes: {
            mL: 1e-3,
            cL: 1e-2,
            dL: 1e-1,
            kL: 1e3,
            cm3: 1e-3,
            m3: 1e3,
            // The metric teaspoon and tablespoon used in nutrition labelling and
            // most modern recipes, and the US legal cup.
            tsp: 0.005,
            tbsp: 0.015,
            cup: 0.24,
            // US liquid measure. There is deliberately no bare `gal`, `floz`, `pt`
            // or `qt`: these are exactly the units that differ between systems, so
            // a creator has to say which they mean. Units that are the same in both
            // (oz, lb, mi, ft, in, yd) stay unqualified.
            usfloz: 0.0295735295625,
            uspt: 0.473176473,
            usqt: 0.946352946,
            usgal: 3.785411784,
            // Imperial (British) liquid measure.
            ukfloz: 0.0284130625,
            ukpt: 0.56826125,
            ukqt: 1.1365225,
            ukgal: 4.54609,
        },
    },
    {
        hub: 'mps',
        spokes: {
            kmph: { of: 3.6, is: 1 },
            miph: 0.44704,
            ftps: 0.3048,
            // One nautical mile per hour.
            kn: { of: 3600, is: 1852 },
        },
    },
    {
        hub: 'Pa',
        spokes: {
            hPa: 100,
            kPa: 1000,
            bar: 1e5,
            atm: 101325,
            psi: 6894.757293168361,
            mmHg: 133.322387415,
        },
    },
    {
        hub: 'J',
        spokes: {
            kJ: 1000,
            // The thermochemical calorie. A food "Calorie" is a kilocalorie.
            cal: 4.184,
            kcal: 4184,
            Wh: 3600,
            kWh: 3.6e6,
            BTU: 1055.05585262,
            eV: new Decimal('1.602176634e-19'),
        },
    },
    {
        hub: 'W',
        spokes: {
            mW: 1e-3,
            kW: 1e3,
            MW: 1e6,
            GW: 1e9,
            // Mechanical horsepower, 550 foot-pounds-force per second.
            hp: 745.6998715822702,
        },
    },
    { hub: 'A', spokes: { uA: 1e-6, mA: 1e-3, kA: 1e3 } },
    { hub: 'V', spokes: { mV: 1e-3, kV: 1e3 } },
    { hub: 'ohm', spokes: { mohm: 1e-3, kohm: 1e3, Mohm: 1e6 } },
    {
        hub: 'Hz',
        spokes: {
            kHz: 1e3,
            MHz: 1e6,
            GHz: 1e9,
            // Sixty beats per minute is one beat per second.
            bpm: { of: 60, is: 1 },
        },
    },
    {
        hub: 'B',
        spokes: {
            bit: { of: 8, is: 1 },
            kB: 1e3,
            MB: 1e6,
            GB: 1e9,
            TB: 1e12,
            KiB: 1024,
            MiB: 1048576,
            GiB: 1073741824,
            TiB: 1099511627776,
        },
    },
    { hub: 'lux', spokes: { fc: 10.763910416709722 } },
];

export const AffineConversions: AffineConversion[] = [
    // Fahrenheit: °F = °C × 9/5 + 32.
    { from: 'degC', to: 'degF', factor: 1.8, offset: 32 },
    // Kelvin: the same size as a degree Celsius, offset to absolute zero. The
    // factor of 1 is what relabels the unit.
    { from: 'degC', to: 'K', factor: 1, offset: 273.15 },
];

/** A unit's name in one locale, e.g. "kilometers per hour". */
function nameOf(key: UnitKey): (locale: LocaleText) => string {
    return (locale) =>
        withoutAnnotations(
            selectTranslation(locale, (l) => l.basis.Number.unit[key]),
        );
}

/** The doc for one conversion: the locale's "$from to $to" filled with two unit names. */
function getUnitDocLocales(locales: Locales, from: UnitKey, to: UnitKey): Docs {
    const fromName = nameOf(from);
    const toName = nameOf(to);
    return getTemplatedDocLocales(
        locales,
        (locale) => locale.basis.Number.conversion.unit,
        (locale) => ({ from: fromName(locale), to: toName(locale) }),
    );
}

/** The Wordplay unit for a key, e.g. `m/s` for `mps`. */
export function unitFor(key: UnitKey): Unit {
    const definition: UnitDefinition = Units[key];
    return Unit.reuse(
        [...definition.numerator],
        definition.denominator ? [...definition.denominator] : [],
    );
}

/** The number type for a key, e.g. `#m/s` for `mps`. */
export function typeFor(key: UnitKey): NumberType {
    return NumberType.make(unitFor(key));
}

/** The unit that relabels `from` as `to`, e.g. `s/min` for min → s. */
function relabel(from: UnitKey, to: UnitKey): Unit {
    const source: UnitDefinition = Units[from];
    const target: UnitDefinition = Units[to];
    return Unit.reuse(
        [...target.numerator, ...(source.denominator ?? [])],
        [...(target.denominator ?? []), ...source.numerator],
    );
}

function toRatio(size: Size): Ratio {
    return typeof size === 'number' || size instanceof Decimal
        ? { of: 1, is: size }
        : size;
}

function isOne(amount: Amount): boolean {
    return new Decimal(amount).eq(1);
}

/**
 * `value × times ÷ divisor`, relabeled from `from` to `to`. The multiply always
 * happens, even by one, because it is what carries the unit change; multiplying by
 * one is exact, and skipping the divide when it is one keeps a single rounding.
 */
function scale(
    from: UnitKey,
    to: UnitKey,
    times: Amount,
    divisor: Amount,
): (requestor: Expression, value: NumberValue) => Value {
    const unit = relabel(from, to);
    return (requestor, value) => {
        const scaled = value.multiply(
            requestor,
            new NumberValue(requestor, times, unit),
        );
        return isOne(divisor)
            ? scaled
            : scaled.divide(requestor, new NumberValue(requestor, divisor));
    };
}

/** Both directions of one hub↔spoke pair. */
function conversionsForSpoke(
    locales: Locales,
    hub: UnitKey,
    spoke: UnitKey,
    size: Size,
): ConversionDefinition[] {
    const { of, is } = toRatio(size);
    return [
        createBasisConversion(
            getUnitDocLocales(locales, spoke, hub),
            typeFor(spoke),
            typeFor(hub),
            scale(spoke, hub, is, of),
        ),
        createBasisConversion(
            getUnitDocLocales(locales, hub, spoke),
            typeFor(hub),
            typeFor(spoke),
            scale(hub, spoke, of, is),
        ),
    ];
}

/** Both directions of one affine pair. */
function conversionsForAffine(
    locales: Locales,
    { from, to, factor, offset }: AffineConversion,
): ConversionDefinition[] {
    const forwardUnit = relabel(from, to);
    const backwardUnit = relabel(to, from);
    const offsetUnit = unitFor(to);
    const shifts = !new Decimal(offset).isZero();
    return [
        createBasisConversion(
            getUnitDocLocales(locales, from, to),
            typeFor(from),
            typeFor(to),
            (requestor: Expression, value: NumberValue) => {
                const scaled = value.multiply(
                    requestor,
                    new NumberValue(requestor, factor, forwardUnit),
                );
                return shifts
                    ? scaled.add(
                          requestor,
                          new NumberValue(requestor, offset, offsetUnit),
                      )
                    : scaled;
            },
        ),
        createBasisConversion(
            getUnitDocLocales(locales, to, from),
            typeFor(to),
            typeFor(from),
            (requestor: Expression, value: NumberValue) => {
                const shifted = shifts
                    ? value.subtract(
                          requestor,
                          new NumberValue(requestor, offset, offsetUnit),
                      )
                    : value;
                const relabeled = shifted.multiply(
                    requestor,
                    new NumberValue(requestor, 1, backwardUnit),
                );
                return isOne(factor)
                    ? relabeled
                    : relabeled.divide(
                          requestor,
                          new NumberValue(requestor, factor),
                      );
            },
        ),
    ];
}

/** Every built-in unit conversion, for the number basis to spread into its block. */
export default function createUnitConversions(
    locales: Locales,
): ConversionDefinition[] {
    return [
        ...Dimensions.map((dimension) =>
            Object.entries(dimension.spokes).flatMap(([spoke, size]) =>
                conversionsForSpoke(
                    locales,
                    dimension.hub,
                    spoke as UnitKey,
                    size,
                ),
            ),
        ).flat(),
        ...AffineConversions.flatMap((affine) =>
            conversionsForAffine(locales, affine),
        ),
    ];
}
