import type Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type LanguageCode from '@translation/LanguageCode';
import type Value from '@runtime/Value';
import type Color from './Color';
import Output from './Output';
import type Place from './Place';
import { getBind } from '@translation/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type { Description } from '@translation/Translation';
import type { RenderContext } from './RenderContext';

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
