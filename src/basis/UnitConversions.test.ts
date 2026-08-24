import evaluateCode from '@runtime/evaluate';
import Decimal from 'decimal.js';
import { describe, expect, test } from 'vitest';
import {
    AffineConversions,
    Dimensions,
    Units,
    type UnitKey,
} from '@basis/UnitConversions';

/** The Wordplay source text for a unit, e.g. `m/s`. */
function symbol(key: UnitKey): string {
    const { numerator, denominator } = {
        denominator: [] as readonly string[],
        ...Units[key],
    };
    const group = (dims: readonly string[]) =>
        Array.from(new Set(dims))
            .map((d) =>
                dims.filter((o) => o === d).length > 1
                    ? `${d}^${dims.filter((o) => o === d).length}`
                    : d,
            )
            .join('·');
    return (
        group(numerator) + (denominator.length ? `/${group(denominator)}` : '')
    );
}

const pairs = Dimensions.flatMap((dimension) =>
    Object.keys(dimension.spokes).map(
        (spoke) => [dimension.hub, spoke as UnitKey] as const,
    ),
).concat(AffineConversions.map(({ from, to }) => [from, to] as const));

// Generated from the table so a newly added unit can't skip its own test. A round
// trip only proves the two directions agree, which is why the known values below
// are written out by hand — a mistyped factor round-trips happily.
describe('every unit round trips through its hub', () => {
    test.each(pairs)('%s ↔ %s', (a, b) => {
        const there = `(7${symbol(a)} → #${symbol(b)}) → #${symbol(a)}`;
        const back = `(7${symbol(b)} → #${symbol(a)}) → #${symbol(b)}`;
        for (const code of [there, back]) {
            const result = evaluateCode(code)?.toString() ?? '';
            // A number's text carries its unit, e.g. "7m/s"; keep the numeral.
            const value = new Decimal(
                /^[-+]?[0-9.]+/.exec(result)?.[0] ?? 'NaN',
            );
            expect(
                value.minus(7).abs().lessThan(1e-12),
                `${code} evaluated to ${result?.toString()}`,
            ).toBe(true);
        }
    });
});

// Hand-written against published definitions rather than derived from the table.
test.each([
    // Time. The year was 52 weeks (364 days) before #363.
    ['1yr → #day', '365.25day'],
    ['1day → #h', '24h'],
    ['90min → #h', '1.5h'],
    // Length, including a path with no direct edge.
    ['1mi → #km', '1.609344km'],
    ['1km → #mi', '0.62137119223733396962mi'],
    ['1in → #cm', '2.54cm'],
    ['1ly → #Gm', '9460730.4725808Gm'],
    // Mass.
    ['1lb → #oz', '16oz'],
    ['1t → #kg', '1000kg'],
    ['1st → #lb', '14lb'],
    // Temperature.
    ['0°C → #°F', '32°F'],
    ['100°C → #°F', '212°F'],
    ['-40°F → #°C', '-40°C'],
    ['0°C → #K', '273.15K'],
    ['0K → #°C', '-273.15°C'],
    ['32°F → #K', '273.15K'],
    // Angle.
    ['180° → #rad', '3.1415926535897932385rad'],
    // Area.
    ['1ha → #m^2', '10000m^2'],
    ['1m^2 → #cm^2', '10000cm^2'],
    ['1acre → #ft^2', '43560ft^2'],
    // Volume.
    ['1L → #mL', '1000mL'],
    ['1m^3 → #L', '1000L'],
    ['1cup → #mL', '240mL'],
    ['1tbsp → #tsp', '3tsp'],
    ['1usgal → #L', '3.785411784L'],
    ['1ukgal → #L', '4.54609L'],
    ['1usgal → #usfloz', '128usfloz'],
    ['1ukgal → #ukfloz', '160ukfloz'],
    // Speed.
    ['1m/s → #km/h', '3.6km/h'],
    ['1mi/h → #km/h', '1.609344km/h'],
    // Pressure.
    ['1atm → #Pa', '101325Pa'],
    ['1bar → #kPa', '100kPa'],
    // Energy.
    ['1kWh → #J', '3600000J'],
    ['1kcal → #cal', '1000cal'],
    // Power.
    ['1kW → #W', '1000W'],
    // Frequency.
    ['60bpm → #Hz', '1Hz'],
    ['1kHz → #Hz', '1000Hz'],
    // Data.
    ['1KiB → #B', '1024B'],
    ['1B → #b', '8b'],
    ['1MiB → #KiB', '1024KiB'],
    // Illuminance.
    ['1fc → #lux', '10.763910416709722lux'],
])('%s = %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

// Conversions with no direct edge, found by Convert's search through the graph.
test.each([
    ['1kWh → #cal', '860420.65009560229446cal'],
    ['1KiB → #b', '8192b'],
    ['1K → #°F', '-457.87°F'],
    ['1usqt → #ukfloz', '33.306967385159554694ukfloz'],
    ['1ly → #au', '63241.077084266280269au'],
])('%s composes to %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

test('booleans convert to numbers', () => {
    expect(evaluateCode('⊤ → #')?.toString()).toBe('1');
    expect(evaluateCode('⊥ → #')?.toString()).toBe('0');
});

// The reason the angle conversion exists: sin/cos/tan are radian functions, so
// before #363 there was no way to take the sine of a rotation. They also kept the
// input's unit, which a ratio cannot have.
test('an angle can be turned into a correct, unitless sine', () => {
    expect(evaluateCode('(45° → #rad).sin()')?.toString()).toBe(
        '0.7071067811865475244',
    );
    // A ratio can't carry the angle's unit, so there is no unit in the text.
    const cosine = evaluateCode('(60° → #rad).cos()')?.toString() ?? '';
    expect(cosine).toMatch(/^[0-9.]+$/);
    expect(Number(cosine)).toBeCloseTo(0.5, 12);
});
