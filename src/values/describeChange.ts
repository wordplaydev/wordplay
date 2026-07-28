import type Locales from '@locale/Locales';
import { formatNumberForLocale } from '@locale/numberFormats';
import type Locale from '@locale/Locale';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import MapValue from '@values/MapValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import FunctionValue from '@values/FunctionValue';
import SetValue from '@values/SetValue';
import StreamDefinitionValue from '@values/StreamDefinitionValue';
import StreamValue from '@values/StreamValue';
import StructureDefinitionValue from '@values/StructureDefinitionValue';
import StructureValue from '@values/StructureValue';
import TableValue from '@values/TableValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';

/**
 * Describes what CHANGED between two values, for screen readers.
 *
 * Screen readers don't re-read live-region text that hasn't changed, and no
 * amount of DOM manipulation persuades them otherwise (a keyed node swap, a
 * microtask clear-and-restore, and a 100ms one were all tried against
 * VoiceOver and all stayed silent). So a running program that summarizes its
 * output by type — "Face" every frame — is heard exactly once.
 *
 * The fix is to say something genuinely different: name the property that
 * changed and its new value ("eyesOpen true"). That's both audible and more
 * useful than a repeated type name.
 */

/**
 * Values are spoken, so they're rendered differently than they're written:
 * numbers round to tenths (a face-tracking amount of 0.4283… says nothing a
 * listener can use), and the ⊤/⊥/ø symbols become words, since a screen
 * reader reads them as glyph names or skips them.
 */
type SpeechTerms = {
    yes: string;
    no: string;
    nothing: string;
    locale: Locale;
};

/**
 * How deep to look for a change. Structures nest (an Expression holds a
 * Place), but a listener can't follow a long path, and this bounds the cost
 * of a walk that runs about once a second.
 */
const MaxDepth = 6;

/** How many values to compare before giving up. Silence is a safe failure. */
const MaxComparisons = 2000;

/** Numbers are rounded to this many decimal places before being spoken. */
const SpokenDecimalPlaces = 1;

/** A change found in a value: what to say, and the top-level property it came
 *  from, so the next search can resume after it. */
export type ValueChange = { name: string; description: string };

/**
 * The next perceptible difference between two values, or undefined if there
 * isn't one.
 *
 * `after` is the property name announced last time. The search resumes just
 * past it and wraps, so every changing property gets a turn: without this, a
 * structure whose first property changes constantly (an Expression's `place`
 * moves every frame) would be the only thing ever announced, and the ones a
 * listener actually wants — eyesOpen, smiling — would never be reached.
 */
export default function describeValueChange(
    locales: Locales,
    previous: Value,
    current: Value,
    after?: string,
): ValueChange | undefined {
    // Resolve the spoken words once per call, not per value: locale getters
    // in hot paths have caused performance regressions before.
    const terms: SpeechTerms = {
        yes: locales.getPrimaryPlainText((l) => l.keyword.true),
        no: locales.getPrimaryPlainText((l) => l.keyword.false),
        nothing: locales.getPrimaryPlainText((l) => l.keyword.none),
        locale: locales.getLocale(),
    };
    const budget = { comparisons: MaxComparisons };
    return changeIn(locales, terms, previous, current, after, 0, budget);
}

/** How a value is spoken on its own — rounded, worded, and never symbolic. */
export function renderValueForSpeech(locales: Locales, value: Value): string {
    return render(
        locales,
        {
            yes: locales.getPrimaryPlainText((l) => l.keyword.true),
            no: locales.getPrimaryPlainText((l) => l.keyword.false),
            nothing: locales.getPrimaryPlainText((l) => l.keyword.none),
            locale: locales.getLocale(),
        },
        value,
    );
}

function render(locales: Locales, terms: SpeechTerms, value: Value): string {
    if (value instanceof TextValue) return value.text;
    if (value instanceof NumberValue) return renderNumber(terms, value);
    if (value instanceof BoolValue) return value.bool ? terms.yes : terms.no;
    if (value instanceof NoneValue) return terms.nothing;
    // A structure is named by its type, not read out: its contents are what
    // the change search descends into.
    if (value instanceof StructureValue)
        // Not symbolic: a type named 📍 would otherwise be spoken as an emoji.
        return locales.getName(value.type.names, false);
    // Functions, streams, and definitions: their non-symbolic name.
    // toWordplay() below is CODE rendering and speaks symbolic names.
    if (value instanceof FunctionValue)
        return locales.getName(value.definition.names, false);
    if (value instanceof StreamValue)
        return locales.getName(value.definition.names, false);
    if (value instanceof StreamDefinitionValue)
        return locales.getName(value.definition.names, false);
    if (value instanceof StructureDefinitionValue)
        return locales.getName(value.definition.names, false);
    return value.toWordplay();
}

function renderNumber(terms: SpeechTerms, value: NumberValue): string {
    // Infinities and NaN have no rounded form; say them as written.
    if (!value.num.isFinite()) return value.toWordplay();
    // toDecimalPlaces keeps an integer an integer ("5", not "5.0"), and
    // toFixed() with no argument guarantees the plain, non-exponential string
    // that formatNumberForLocale expects.
    const numeric = value.num.toDecimalPlaces(SpokenDecimalPlaces).toFixed();
    return `${formatNumberForLocale(numeric, terms.locale)}${value.unit.toString()}`;
}

/** Join a property name to the change found inside it. */
function within(name: string, change: string): string {
    return `${name} ${change}`;
}

/**
 * The next difference inside two values, as spoken text, or undefined.
 * Comparison is by RENDERED text rather than `isEqualTo`: it's what the
 * listener actually hears, so a change too small to alter the words — below a
 * tenth, after rounding — is correctly silent. It also avoids
 * StructureValue.isEqualTo, which allocates two maps and matches names
 * quadratically on every call.
 */
function changeIn(
    locales: Locales,
    terms: SpeechTerms,
    previous: Value,
    current: Value,
    after: string | undefined,
    depth: number,
    budget: { comparisons: number },
): ValueChange | undefined {
    // The evaluator reuses values for anything an evaluation didn't affect,
    // so identity skips whole unchanged subtrees for free.
    if (previous === current) return undefined;
    if (budget.comparisons-- <= 0) return undefined;

    if (depth < MaxDepth) {
        if (
            previous instanceof StructureValue &&
            current instanceof StructureValue &&
            previous.type === current.type
        )
            return structureChange(
                locales,
                terms,
                previous,
                current,
                after,
                depth,
                budget,
            );
        if (previous instanceof ListValue && current instanceof ListValue)
            return indexedChange(
                locales,
                terms,
                previous.values,
                current.values,
                after,
                depth,
                budget,
            );
        if (previous instanceof TableValue && current instanceof TableValue)
            return indexedChange(
                locales,
                terms,
                previous.rows,
                current.rows,
                after,
                depth,
                budget,
            );
        if (previous instanceof MapValue && current instanceof MapValue)
            return mapChange(
                locales,
                terms,
                previous,
                current,
                after,
                depth,
                budget,
            );
        if (previous instanceof SetValue && current instanceof SetValue)
            return setChange(locales, terms, previous, current);
    }

    // A leaf, a type change, or too deep to descend: say the new value if it
    // sounds different than the old one.
    const description = render(locales, terms, current);
    return render(locales, terms, previous) === description
        ? undefined
        : { name: description, description };
}

function structureChange(
    locales: Locales,
    terms: SpeechTerms,
    previous: StructureValue,
    current: StructureValue,
    after: string | undefined,
    depth: number,
    budget: { comparisons: number },
): ValueChange | undefined {
    // The declared inputs, not the evaluation's bindings: bindings allocate a
    // map per call and include locals and functions the creator never wrote.
    const inputs = current.type.inputs;
    if (inputs.length === 0) return undefined;

    // Resume after the property announced last time, wrapping around.
    const start =
        after === undefined
            ? 0
            : (inputs.findIndex((input) => input.hasName(after)) + 1) %
              inputs.length;

    for (let offset = 0; offset < inputs.length; offset++) {
        const input = inputs[(start + offset) % inputs.length];
        const before = previous.resolve(input.names);
        const now = current.resolve(input.names);
        if (before === undefined || now === undefined) continue;
        const change = changeIn(
            locales,
            terms,
            before,
            now,
            // Only the top-level property round-robins; nested searches always
            // start from the beginning of their own structure.
            undefined,
            depth + 1,
            budget,
        );
        if (change !== undefined) {
            // Resolve the name only for the property that actually changed.
            const name = locales.getName(input.names, false);
            return {
                name: input.getNames()[0],
                description: within(name, change.description),
            };
        }
    }
    return undefined;
}

/** Lists and tables: compare position by position, then report growth. */
function indexedChange(
    locales: Locales,
    terms: SpeechTerms,
    previous: Value[],
    current: Value[],
    after: string | undefined,
    depth: number,
    budget: { comparisons: number },
): ValueChange | undefined {
    const shared = Math.min(previous.length, current.length);
    // Resume after the index announced last time, so one busy element can't
    // hide the rest of a long list.
    const resume = after === undefined ? 0 : Number(after);
    const start = Number.isInteger(resume) && resume > 0 ? resume % shared : 0;
    for (let offset = 0; offset < shared; offset++) {
        const index = (start + offset) % shared;
        const change = changeIn(
            locales,
            terms,
            previous[index],
            current[index],
            undefined,
            depth + 1,
            budget,
        );
        if (change !== undefined) {
            // Wordplay lists are 1-based, so say the index a creator would.
            const name = `${index + 1}`;
            return { name, description: within(name, change.description) };
        }
    }
    // Grew: the first added item is the news. A collection that only shrank
    // has nothing new to report, so it stays silent rather than announcing a
    // count no one asked for.
    if (current.length > previous.length) {
        const name = `${previous.length + 1}`;
        return {
            name,
            description: within(
                name,
                render(locales, terms, current[previous.length]),
            ),
        };
    }
    return undefined;
}

function mapChange(
    locales: Locales,
    terms: SpeechTerms,
    previous: MapValue,
    current: MapValue,
    after: string | undefined,
    depth: number,
    budget: { comparisons: number },
): ValueChange | undefined {
    const entries = current.values;
    if (entries.length === 0) return undefined;
    const start =
        after === undefined
            ? 0
            : (entries.findIndex(
                  ([key]) => render(locales, terms, key) === after,
              ) +
                  1) %
              entries.length;
    for (let offset = 0; offset < entries.length; offset++) {
        const [key, value] = entries[(start + offset) % entries.length];
        const name = render(locales, terms, key);
        const before = previous.values.find(([other]) =>
            other.isEqualTo(key),
        )?.[1];
        if (before === undefined)
            // A new key: say the key and what it holds.
            return {
                name,
                description: within(name, render(locales, terms, value)),
            };
        const change = changeIn(
            locales,
            terms,
            before,
            value,
            undefined,
            depth + 1,
            budget,
        );
        if (change !== undefined)
            return { name, description: within(name, change.description) };
    }
    return undefined;
}

/** Sets are unordered, so position means nothing: the news is what's new. */
function setChange(
    locales: Locales,
    terms: SpeechTerms,
    previous: SetValue,
    current: SetValue,
): ValueChange | undefined {
    for (const value of current.values) {
        if (!previous.values.some((other) => other.isEqualTo(value))) {
            const description = render(locales, terms, value);
            return { name: description, description };
        }
    }
    return undefined;
}
