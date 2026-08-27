import { getUnitCategory, type UnitCategory } from '@basis/UnitConversions';
import { getUnitKey } from '@components/editor/menu/unitName';
import Dimension from '@nodes/Dimension';
import type Node from '@nodes/Node';
import Unit from '@nodes/Unit';

/** A unit the conversion table doesn't define: a creator's own `1cat`, or one a basis
 *  structure declares, like `beats` or `semitones`. */
export const OtherUnits = 'other';

export type UnitGroup = UnitCategory | typeof OtherUnits;

/**
 * The kind of measurement a unit suggestion belongs to, or undefined when the suggestion isn't
 * a unit at all. The menu groups by this so a creator looking for `km` reads a short list of
 * lengths rather than scrolling every unit there is.
 *
 * Only a `Unit` or a `Dimension` gets a group. A `NumberLiteral` carrying a unit is deliberately
 * left out — `5m` is a number a creator might pick, not a length they're choosing between.
 */
export default function getUnitGroup(node: Node): UnitGroup | undefined {
    if (!(node instanceof Unit || node instanceof Dimension)) return undefined;
    const key = getUnitKey(node);
    return key === undefined
        ? OtherUnits
        : (getUnitCategory(key) ?? OtherUnits);
}
