import ListValue from '@values/ListValue';
import MapValue from '@values/MapValue';
import SetValue from '@values/SetValue';
import StructureValue from '@values/StructureValue';
import TableValue from '@values/TableValue';
import TextValue from '@values/TextValue';
import BoolValue from '@values/BoolValue';
import MarkupValue from '@values/MarkupValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import type Value from '@values/Value';
import { first } from '@util/nullable';

/**
 * Whether a value is worth offering a file for — **without walking it**.
 *
 * This is the only thing a render path or a menu build may call. It is a class
 * test plus, for a collection, its first element; the walk that decides which
 * formats actually work is `formatsFor`, and that runs when the dialog opens.
 * The two can disagree — a list whose hundredth item is a function passes here
 * and fails there — and the dialog says so, which is cheaper than walking a
 * thousand-element list on every frame that renders it.
 *
 * A lone number, text or boolean is deliberately not exportable. With CSV and
 * JSON as the formats there is nothing sensible to put in the file, and it is
 * what keeps the menu item off every number literal.
 */
export function canExport(value: Value): boolean {
    if (value instanceof TableValue || value instanceof StructureValue)
        return true;
    if (value instanceof MapValue) return value.values.length > 0;
    if (value instanceof ListValue || value instanceof SetValue) {
        const item = first(value.values);
        return item !== undefined && isData(item);
    }
    return false;
}

/** Whether a value is data at all, as opposed to a function, a stream, a
 *  definition or an exception. One class test, no recursion — checking a whole
 *  collection is `formatsFor`'s job. */
function isData(value: Value): boolean {
    return (
        value instanceof TextValue ||
        value instanceof NumberValue ||
        value instanceof BoolValue ||
        value instanceof NoneValue ||
        value instanceof MarkupValue ||
        value instanceof TableValue ||
        value instanceof StructureValue ||
        value instanceof ListValue ||
        value instanceof SetValue ||
        value instanceof MapValue
    );
}
