/**
 * Reading a locale's keyboard-key-name table.
 *
 * Split out of Key.ts, which is a `StreamDefinition` and so reaches the whole
 * node and runtime layer — far too much to put on every page that renders a
 * button with a keyboard shortcut in its tooltip. Nothing here imports beyond
 * the locale types and the key list.
 *
 * The table's shape is load-bearing and asymmetric. **Entry 0 is what `Key()`
 * emits into a creator's program** — a German program compares against
 * `'Flucht'` — so it is data, not a label, and changing it changes what shipped
 * programs match. The remaining entries are aliases the `key` filter also
 * accepts, which makes them additive: adding one can't break a program.
 */

import type { KeyMap } from '@input/Key/KeyboardKeys';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { first, last } from '@util/nullable';

/** Annotation-stripped key tables, keyed by the raw table object so the strip
 *  runs once per loaded locale rather than on every keystroke. */
const KeyMapCache = new WeakMap<object, KeyMap>();

/** Look up the locale's keyboard-key-name table. Bundled in the main locale
 *  JSON under `ui.input.Key.keys` (see InputTexts.ts), so it's synchronously
 *  available wherever a `Locales` is.
 *
 *  Aliases are read straight off the locale JSON, so each is stripped of its
 *  write-status annotation: a machine-translated locale stores `$~Espacio`,
 *  and serving that raw made the stream report `$~Espacio` for the space bar —
 *  no program's comparison could ever match it, and `canonicalizeKeyName`
 *  couldn't recognize the locale's own alias either. */
export function getKeyMapOf(locale: LocaleText): KeyMap {
    const raw = locale.input.Key.keys;
    if (raw === undefined) return {};
    const cached = KeyMapCache.get(raw);
    if (cached !== undefined) return cached;
    const stripped: KeyMap = {};
    for (const [canonical, aliases] of Object.entries(raw))
        stripped[canonical] = aliases.map((alias) => withoutAnnotations(alias));
    KeyMapCache.set(raw, stripped);
    return stripped;
}

export function getKeyMap(locales: Locales): KeyMap {
    return getKeyMapOf(locales.getLocale());
}

/** Localize the browser's English `event.key` to the primary locale's display
 *  name. Falls back to the canonical English value if the key isn't in the
 *  curated WellKnownKeys list or the locale's table lacks it. */
export function localizeKeyName(
    canonicalEnglish: string,
    locales: Locales,
): string {
    const map = getKeyMap(locales);
    const entry = map[canonicalEnglish];
    return (entry === undefined ? undefined : first(entry)) ?? canonicalEnglish;
}

/**
 * How a key is *printed on a keycap*, for naming a shortcut.
 *
 * Deliberately the **last** alias rather than entry 0: entry 0 is the value the
 * stream emits, which in English is the machine spelling (`"PageUp"`,
 * `"ArrowLeft"`) and in a translated locale is a literal rendering of the
 * English word rather than what the key is called. The later aliases are where
 * the readable spellings live (`"Page Up"`, `"Esc"`), and because they are only
 * ever *read* for matching, improving one is safe for existing programs in a
 * way that editing entry 0 is not.
 *
 * Returns undefined when the table has nothing better to offer, so the caller
 * keeps its own glyph — which is what the four arrows want, since `←` is on the
 * keycap in every locale and "Pfeil nach links" is not.
 */
export function keyLabelFor(
    canonicalEnglish: string,
    locales: Locales,
): string | undefined {
    const entry = getKeyMap(locales)[canonicalEnglish];
    if (entry === undefined || entry.length === 0) return undefined;
    return entry.length > 1 ? last(entry) : first(entry);
}
