import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import LocalePath from '@util/verify-locales/LocalePath';

/**
 * Reflects on an accessor function to extract its locale property path, and converts it
 * into a LocalePath. Optional trailing segments are appended to address nested fields or
 * array elements (e.g., a tuple index in `ModeText.labels`). Returns undefined if the
 * accessor doesn't resolve to a place in the locale tree.
 *
 * Examples:
 *   `(l) => l.ui.localize.button.edit` → LocalePath with path ['ui','localize','button'], key 'edit'
 *   accessor `(l) => l.ui.dialog.settings.mode.dark` + `'labels', 0` → key 0 at path ['ui','dialog','settings','mode','dark','labels']
 */
export function accessorToLocalePath(
    accessor: (locale: LocaleText) => unknown,
    ...trailing: (string | number)[]
): LocalePath | undefined {
    // Recording wins; the source pattern is only consulted when the accessor computes
    // something rather than returning a place in the tree.
    const recorded = recordSegments(accessor) ?? matchSegments(accessor);
    if (recorded === undefined) return undefined;

    const segments: (string | number)[] = [...recorded, ...trailing];
    if (segments.length === 0) return undefined;

    const key = segments[segments.length - 1];
    const path = segments.slice(0, segments.length - 1);
    const derived = new LocalePath(path, key, '');

    // A path is only editable if it names a string en-US has written. Every locale mirrors
    // en-US, so this costs nothing real and refuses everything that isn't a place to edit: a
    // path invented by walking past locale text into a method name, and — the reason it
    // matters — a parent object, which is what the source pattern below returns for a
    // computed key. Saving under such a key would replace a whole subtree with one string.
    return derived.resolve(DefaultLocale) === undefined ? undefined : derived;
}

/** Reads the path a recorder accumulated. A symbol, so it can never collide with a locale key. */
const RecordedPath = Symbol('locale-path');

/**
 * A stand-in locale that records the property path an accessor walks through it. Its target
 * is a *function* so that `Conflict.LocalePath(l).c` works — that helper is a real function
 * called *with* the recorder, and a proxy is only a valid argument to one if it is callable.
 * Each access returns a recorder carrying its own path, so a branch the accessor discards
 * can't pollute the branch it returns. Calling a recorder is deliberately not trapped: the
 * only way that happens is a method call on locale text, which has no place to edit.
 */
function recorder(path: (string | number)[]): object {
    return new Proxy(function () {}, {
        get(_, property) {
            if (property === RecordedPath) return path;
            // Symbols are protocol hooks (Symbol.toPrimitive, Symbol.iterator, …). Answering
            // one with a recorder would make coercion loop or lie; leaving them undefined is
            // what makes a computing accessor throw, which is the signal to fall back.
            if (typeof property === 'symbol') return undefined;
            return recorder([...path, property]);
        },
        // The whole locale tree is present as far as a recorder is concerned, so an accessor
        // that narrows with `'description' in text` takes the branch it takes in a locale that
        // has written the field — which is the only branch such an accessor is used on.
        has() {
            return true;
        },
    });
}

function isSegments(value: unknown): value is (string | number)[] {
    return (
        Array.isArray(value) &&
        value.every((s) => typeof s === 'string' || typeof s === 'number')
    );
}

/**
 * Run the accessor against a recorder and read back the path it walked. Undefined unless the
 * accessor *returned* a place in the tree: one that computes a value from locale text (e.g.
 * `withoutAnnotations(l.a.b)`, `getConceptName(l, id)`) either returns a plain value or
 * coerces the recorder and throws, and in neither case is there a single place to edit.
 *
 * Typed `Function` rather than the accessor's own signature because a Proxy can't structurally
 * satisfy `LocaleText`; that is the whole point of reflecting, and it's the same reason
 * `Conflict`'s resolver registry and `Button`'s computed-tooltip check are typed this way.
 */
function recordSegments(accessor: Function): (string | number)[] | undefined {
    let result: unknown;
    try {
        result = accessor(recorder([]));
    } catch {
        return undefined;
    }
    if (
        result === null ||
        (typeof result !== 'object' && typeof result !== 'function')
    )
        return undefined;
    if (!(RecordedPath in result)) return undefined;
    const path: unknown = result[RecordedPath];
    return isSegments(path) ? path : undefined;
}

/**
 * The original reflection: match `l.a.b.c` in the accessor's source text. Kept as a fallback
 * for accessors that wrap a locale value in a call — recording can't see through those, and
 * the source can. Note it stops at a `[`, so a computed key reflects as its parent; that is
 * only reachable now when recording has already declined, since recording resolves a computed
 * key correctly.
 */
function matchSegments(accessor: Function): (string | number)[] | undefined {
    const match = accessor
        .toString()
        .match(/\(?\s*(\w+)\s*\)?\s*=>\s*\1\.([a-zA-Z0-9.]+)/);
    return match ? match[2].split('.') : undefined;
}
