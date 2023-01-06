import type Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type LanguageCode from '../translations/LanguageCode';
import type Value from '../runtime/Value';
import type Color from './Color';
import Output from './Output';
import type Phrase from './Phrase';
import type Place from './Place';
import type Animation from './Animation';
import { getBind } from '../translations/getBind';
import { TYPE_SYMBOL } from '../parser/Symbols';
import type { Description } from '../translations/Translation';

export const GroupType = toStructure(`
    ${getBind((t) => t.output.group.definition, TYPE_SYMBOL)}()
`);

export default abstract class Group extends Output {
    constructor(value: Value) {
        super(value);
    }

    /** Compute the width in meters. */
    abstract getWidth(context: RenderContext): Decimal;

    /** Compute the height in meters */
    abstract getHeight(context: RenderContext): Decimal;

    abstract getGroups(): Group[];

    /** Compute positions for all subgroups in the group. */
    abstract getPlaces(context: RenderContext): [Group, Place][];

    abstract getBackground(): Color | undefined;
    abstract getDescription(languages: LanguageCode[]): Description;
}

export type RenderContext = {
    font: string;
    languages: LanguageCode[];
    fonts: Set<string>;
    animations: Map<Phrase, Animation>;
};
