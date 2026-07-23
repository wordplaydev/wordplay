import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';

/** The object categories MediaPipe's EfficientDet-Lite0 detector can recognize.
 *
 * These are the canonical English labels from the model's own metadata: the
 * `.task` bundle contains a single `labels.txt` with 90 entries, 80 real labels
 * (the COCO categories) and 10 `???` placeholders for retired indices, which are
 * omitted here. The strings must match the model's `categoryName` exactly, since
 * that's what we look up in the locale table. Swapping in a different detector
 * model means regenerating this list from its labels.
 *
 * Adding an entry also requires adding it to every locale's
 * `input.Objects.categories` table; the locale verifier enforces this.
 */
export const ObjectCategories = [
    'person',
    'bicycle',
    'car',
    'motorcycle',
    'airplane',
    'bus',
    'train',
    'truck',
    'boat',
    'traffic light',
    'fire hydrant',
    'stop sign',
    'parking meter',
    'bench',
    'bird',
    'cat',
    'dog',
    'horse',
    'sheep',
    'cow',
    'elephant',
    'bear',
    'zebra',
    'giraffe',
    'backpack',
    'umbrella',
    'handbag',
    'tie',
    'suitcase',
    'frisbee',
    'skis',
    'snowboard',
    'sports ball',
    'kite',
    'baseball bat',
    'baseball glove',
    'skateboard',
    'surfboard',
    'tennis racket',
    'bottle',
    'wine glass',
    'cup',
    'fork',
    'knife',
    'spoon',
    'bowl',
    'banana',
    'apple',
    'sandwich',
    'orange',
    'broccoli',
    'carrot',
    'hot dog',
    'pizza',
    'donut',
    'cake',
    'chair',
    'couch',
    'potted plant',
    'bed',
    'dining table',
    'toilet',
    'tv',
    'laptop',
    'mouse',
    'remote',
    'keyboard',
    'cell phone',
    'microwave',
    'oven',
    'toaster',
    'sink',
    'refrigerator',
    'book',
    'clock',
    'vase',
    'scissors',
    'teddy bear',
    'hair drier',
    'toothbrush',
] as const;

export type ObjectCategory = (typeof ObjectCategories)[number];

/** Per-locale category-name table.
 *  Keyed by the canonical English label above. Each entry is
 *  `[displayName, ...aliases]` — the first string is the name `Objects()`
 *  emits in this locale, and any of the strings (display name or alias) are
 *  accepted as the `category` filter argument. */
export type CategoryMap = Record<string, readonly string[]>;

/** Look up the locale's category-name table. Bundled in the main locale JSON
 *  under `input.Objects.categories` (see InputTexts.ts), so it's synchronously
 *  available wherever a `Locales` is. */
function getCategoryMap(locales: Locales): CategoryMap {
    return getCategoryMapOf(locales.getLocale());
}

/** The table from one locale, tolerating a locale that predates this stream
 *  (partial locales appear in tests and while translations catch up). */
function getCategoryMapOf(locale: LocaleText): CategoryMap {
    return locale.input.Objects?.categories ?? {};
}

/** Localize the model's English label to the primary locale's display name.
 *  Falls back to the canonical English label if the locale's table lacks it,
 *  so a future model with new labels degrades gracefully instead of emitting
 *  empty text. */
export function localizeCategory(
    canonicalEnglish: string,
    locales: Locales,
): string {
    const entry = getCategoryMap(locales)[canonicalEnglish];
    return entry && entry.length > 0 ? entry[0] : canonicalEnglish;
}

/** Resolve a creator-supplied `category` filter (typed in any locale) back to
 *  the model's canonical English label. Walks every loaded locale's table — so
 *  a French program's `Objects(category: 'chat')` resolves against the French
 *  map while an English program's `Objects(category: 'cat')` matches via the
 *  English one. Returns the input unchanged when nothing matches, which then
 *  simply matches no detections. */
export function canonicalizeCategory(
    userCategory: string,
    locales: Locales,
): string {
    for (const locale of locales.getLocales()) {
        const map = getCategoryMapOf(locale);
        for (const [canonical, aliases] of Object.entries(map)) {
            if (aliases.some((alias) => alias === userCategory))
                return canonical;
        }
    }
    return userCategory;
}

/** Wrap a display name as a Wordplay text literal, choosing a delimiter the name
 *  doesn't contain (single quote by default, double quote as fallback). Returns
 *  undefined if the name contains both, so the caller can skip it rather than
 *  emit an unparsable literal. */
function toTextLiteral(name: string): string | undefined {
    if (!name.includes("'")) return `'${name}'`;
    if (!name.includes('"')) return `"${name}"`;
    return undefined;
}

/** A Wordplay type-union of the localized category literals (no catch-all), for
 *  interpolation into `Thing`'s `name` field type via `toStructure` — the
 *  [Phrase.ts] pattern for a computed text-literal union. Stating the exact set
 *  is what lets hover and autocomplete show every possible name. Uses the same
 *  display names {@link localizeCategory} emits, so the type and values agree. */
export function categoryTypeUnionCode(locales: Locales): string {
    const map = getCategoryMap(locales);
    const literals = ObjectCategories.map(
        (canonical) => map[canonical]?.[0] ?? canonical,
    )
        .map(toTextLiteral)
        .filter((literal): literal is string => literal !== undefined);
    return literals.join('|');
}

/** Type union for the `category` parameter: one literal-text type per category
 *  in the primary locale's display name, plus an untagged catch-all `Text` so
 *  any other string still type-checks. Mirrors `Key`'s key union — the type is
 *  the documentation, surfacing every category in autocomplete and on hover.
 *  Literal-text types are deliberately untagged; a language tag would break
 *  downstream type matching (`TextType.acceptsAll` requires tag equality). */
export function buildCategoryTypeUnion(locales: Locales): Type {
    const map = getCategoryMap(locales);
    const all: Type[] = [
        ...ObjectCategories.map((canonical) =>
            TextType.make(map[canonical]?.[0] ?? canonical),
        ),
        TextType.make(),
    ];
    return all.reduce((acc, type) => UnionType.make(acc, type));
}
