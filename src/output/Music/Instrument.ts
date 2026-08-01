import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import { getBind } from '@locale/getBind';
import { SHARE_SYMBOL, TYPE_SYMBOL } from '@parser/Symbols';
import type Bind from '@nodes/Bind';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Evaluator from '@runtime/Evaluator';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import Valued, { getOutputInput } from '@output/Output/Valued';
import { InstrumentKeys, type InstrumentKey } from '@output/Music/instruments';

export function createInstrumentType(locales: Locales) {
    // One `↑ <multilingual names>: 🔈('<id>')` static bind per palette entry,
    // the way Color names colors. The id is the en-US key; everything the
    // player knows about an instrument hangs off it in `instruments.ts`.
    const statics = InstrumentKeys.map((key) => {
        const bind = getBind(
            locales,
            (locale) => locale.output.Instrument.instruments[key],
            `${SHARE_SYMBOL} `,
        );
        return `${bind}: 🔈('${key}')`;
    }).join('\n');

    const definition = toStructure(`
    ${getBind(locales, (locale) => locale.output.Instrument, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Instrument.id)}•''
    ) (
        ${statics}
    )`);

    // Instrument is a basis structure, so its `↑` binds are never compiled;
    // construct the static values directly, as Color does for its color terms.
    definition.staticBuilder = (
        evaluator: Evaluator,
        def: StructureDefinition,
    ): Map<Bind, Value> => {
        const map = new Map<Bind, Value>();
        const context = evaluator.project.getContext(
            evaluator.project.getMain(),
        );
        for (const bind of def.getStaticBindsWithValues(context)) {
            // The en-US key is always among the bind's names, since getBind
            // includes the English name in every locale's name list.
            const names = bind.names.getNames();
            const key = InstrumentKeys.find((candidate) =>
                names.includes(candidate),
            );
            if (key === undefined) continue;
            map.set(
                bind,
                StructureValue.make(
                    evaluator,
                    evaluator.project.getMain(),
                    def,
                    new TextValue(bind, key),
                ),
            );
        }
        return map;
    };

    return definition;
}

/** An opaque handle to a palette entry; the player resolves the id. */
export default class Instrument extends Valued {
    readonly id: InstrumentKey | string;

    constructor(value: Value, id: string) {
        super(value);
        this.id = id;
    }
}

export function toInstrument(value: Value | undefined): Instrument | undefined {
    if (!(value instanceof StructureValue)) return undefined;
    const id = getOutputInput(value, 0);
    return id instanceof TextValue ? new Instrument(value, id.text) : undefined;
}
