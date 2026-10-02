import { getTypeName } from '#locale/getNameLocales.ts';
import toStructure from '#basis/toStructure.ts';
import { categoryTypeUnionCode } from '#input/Objects/ObjectCategories.ts';
import { getBind } from '#locale/getBind.ts';
import type Locales from '#locale/Locales.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import NumberValue from '#values/NumberValue.ts';
import StructureValue from '#values/StructureValue.ts';
import TextValue from '#values/TextValue.ts';
import Unit from '#nodes/Unit.ts';

/**
 * One thing the camera saw, emitted as an element of the `Objects` stream's
 * list: what it is (in the creator's language), how sure the model is, and
 * where and how big it appeared on stage.
 */
export function createThingType(locales: Locales) {
    const placeName = getTypeName(locales, (l) => l.output.Place.names);
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Thing, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Thing.name)}•${categoryTypeUnionCode(locales)}|'': ''
        ${getBind(locales, (locale) => locale.output.Thing.confidence)}•#: 0
        ${getBind(locales, (locale) => locale.output.Thing.place)}•${placeName}: ${placeName}()
        ${getBind(locales, (locale) => locale.output.Thing.width)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Thing.height)}•#m: 0m
    )
`);
}

export type ThingState = {
    name: string;
    confidence: number;
    place: StructureValue;
    width: number;
    height: number;
};

export function createThingStructure(
    evaluator: Evaluator,
    state: ThingState,
): StructureValue {
    const creator = evaluator.getMain();
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Thing,
        // Untagged text, like the names `Key()` emits: the name identifies the
        // category, and a language tag would only complicate comparisons.
        new TextValue(creator, state.name),
        new NumberValue(creator, state.confidence),
        state.place,
        new NumberValue(creator, state.width, Unit.meters()),
        new NumberValue(creator, state.height, Unit.meters()),
    );
}
