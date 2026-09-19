import type Locales from '@locale/Locales';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import MapValue from '@values/MapValue';
import MarkupValue from '@values/MarkupValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import SetValue from '@values/SetValue';
import StructureValue from '@values/StructureValue';
import TableValue from '@values/TableValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';

/**
 * How deep a value may nest before we stop. Nothing in the language can build a
 * cycle out of data alone — structures are immutable and built bottom up — but
 * a budget costs one integer and turns a hang into a refusal.
 */
const MaxDepth = 64;

/** What a value lost on the way out, so the dialog can say so rather than
 *  quietly changing the numbers. */
export type JSONNotes = {
    /** A number carried a unit, which a JSON number has nowhere to put. */
    droppedUnits: boolean;
    /** A number was NaN or infinite, which JSON cannot express at all. */
    unrepresentableNumbers: boolean;
};

export type JSONResult = { text: string; notes: JSONNotes };

/**
 * A value as JSON text, or undefined when anything reachable from it is not
 * data — a function, a stream, a definition, an exception.
 *
 * Rendered by hand rather than through `JSON.stringify` so that a number keeps
 * the exact decimal text `Decimal` holds. Wordplay uses decimal.js precisely
 * because binary floats lie, and round-tripping every number through one on the
 * way out would hand that lie to the spreadsheet.
 */
export default function toJSON(
    value: Value,
    locales: Locales,
): JSONResult | undefined {
    const notes: JSONNotes = {
        droppedUnits: false,
        unrepresentableNumbers: false,
    };
    const text = render(value, locales, notes, 0, '');
    return text === undefined ? undefined : { text, notes };
}

function render(
    value: Value,
    locales: Locales,
    notes: JSONNotes,
    depth: number,
    indent: string,
): string | undefined {
    if (depth > MaxDepth) return undefined;
    const inner = `${indent}  `;

    if (value instanceof NoneValue) return 'null';
    if (value instanceof BoolValue) return value.bool ? 'true' : 'false';
    if (value instanceof TextValue) return quote(value.text);
    if (value instanceof MarkupValue) return quote(value.markup.toText());
    if (value instanceof NumberValue) return number(value, notes);

    if (value instanceof ListValue || value instanceof SetValue)
        return list(value.values, locales, notes, depth, indent, inner);

    if (value instanceof TableValue)
        return list(value.rows, locales, notes, depth, indent, inner);

    if (value instanceof StructureValue) {
        const entries: [string, Value][] = [];
        for (const bind of value.type.inputs) {
            const field = value.resolve(bind.names);
            if (field === undefined) continue;
            entries.push([locales.getName(bind.names, false), field]);
        }
        return object(entries, locales, notes, depth, indent, inner);
    }

    if (value instanceof MapValue) {
        // An object when the keys read as names and none of them collide;
        // otherwise pairs, which keeps every key rather than losing one to a
        // duplicate.
        const keys = value.values.map(([key]) => keyText(key, notes));
        const named =
            keys.every((key) => key !== undefined) &&
            new Set(keys).size === keys.length;
        if (named) {
            const entries: [string, Value][] = [];
            for (const [index, [, item]] of value.values.entries()) {
                const key = keys[index];
                if (key === undefined) return undefined;
                entries.push([key, item]);
            }
            return object(entries, locales, notes, depth, indent, inner);
        }
        const pairs = value.values.map(([key, item]) => ({ key, item }));
        const rendered = pairs.map(({ key, item }) => {
            const k = render(key, locales, notes, depth + 1, inner);
            const v = render(item, locales, notes, depth + 1, inner);
            return k === undefined || v === undefined
                ? undefined
                : `${inner}  "key": ${k},\n${inner}  "value": ${v}`;
        });
        if (rendered.some((entry) => entry === undefined)) return undefined;
        return rendered.length === 0
            ? '[]'
            : `[\n${rendered
                  .map((entry) => `${inner}{\n${entry}\n${inner}}`)
                  .join(',\n')}\n${indent}]`;
    }

    // A function, a stream, a definition, an exception: not data, so neither is
    // anything holding one.
    return undefined;
}

function list(
    values: readonly Value[],
    locales: Locales,
    notes: JSONNotes,
    depth: number,
    indent: string,
    inner: string,
): string | undefined {
    if (values.length === 0) return '[]';
    const items = values.map((item) =>
        render(item, locales, notes, depth + 1, inner),
    );
    if (items.some((item) => item === undefined)) return undefined;
    return `[\n${items.map((item) => `${inner}${item}`).join(',\n')}\n${indent}]`;
}

function object(
    entries: readonly [string, Value][],
    locales: Locales,
    notes: JSONNotes,
    depth: number,
    indent: string,
    inner: string,
): string | undefined {
    if (entries.length === 0) return '{}';
    const rendered = entries.map(([name, item]) => {
        const text = render(item, locales, notes, depth + 1, inner);
        return text === undefined
            ? undefined
            : `${inner}${quote(name)}: ${text}`;
    });
    if (rendered.some((entry) => entry === undefined)) return undefined;
    return `{\n${rendered.join(',\n')}\n${indent}}`;
}

/** A map key as an object key, or undefined when it isn't one. */
function keyText(key: Value, notes: JSONNotes): string | undefined {
    if (key instanceof TextValue) return key.text;
    if (key instanceof NumberValue) {
        const text = number(key, notes);
        return text === 'null' ? undefined : text;
    }
    return undefined;
}

/** A number, losing its unit — a JSON number has nowhere to put one — and
 *  becoming null when JSON cannot express it at all. */
function number(value: NumberValue, notes: JSONNotes): string {
    if (value.num.isNaN() || !value.num.isFinite()) {
        notes.unrepresentableNumbers = true;
        return 'null';
    }
    if (!value.unit.isUnitless()) notes.droppedUnits = true;
    return value.num.toString();
}

/** JSON's own string escaping, which is not the same as JavaScript's. */
function quote(text: string): string {
    return JSON.stringify(text);
}
