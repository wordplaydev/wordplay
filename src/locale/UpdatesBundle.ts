/**
 * The shapes behind the updates page, shared by the build script that writes
 * them (`scripts/updates.ts`), the locale tooling that translates them
 * (`src/util/verify-locales/verifyChangelog.ts`), and the app that renders them.
 *
 * There are two files, and the split is the whole design. The **structural**
 * bundle (`static/updates.json`) holds every release's version, date, section,
 * emoji marker, and English markup — built from CHANGELOG.md, never committed.
 * A **translation map** (`static/locales/<code>/<code>-updates.json`) holds
 * nothing but `id → translated markup`, so structure is stored once rather than
 * 29 times and an id with no translation falls back to English on its own.
 */

/** One translatable piece of prose: a stable id and its Wordplay markup. */
export type UpdateText = { id: string; markup: string };

/** A bullet. The emoji is a category marker rather than prose — it is never
 *  translated, and it is `aria-hidden` in the page besides. */
export type UpdateEntry = UpdateText & { emoji: string | null };

/** The four CHANGELOG section headings, whose labels are localized separately
 *  at `ui.page.updates.categories`. */
export const UpdateSectionKinds = [
    'added',
    'changed',
    'fixed',
    'removed',
] as const;

export type UpdateSectionKind = (typeof UpdateSectionKinds)[number];

export type UpdateRelease = {
    version: string;
    /** Null for the legacy `## 0.16.38` headings, which the page filters out. */
    date: string | null;
    summary: UpdateText | null;
    changes: Record<UpdateSectionKind, UpdateEntry[]>;
    summaries: Record<UpdateSectionKind, UpdateText | null>;
};

export type UpdatesBundle = { format: number; updates: UpdateRelease[] };

/** One locale's translations, keyed by the structural bundle's ids. Values
 *  carry their write status (`$~`), which is what lets `override` find a
 *  machine translation and what gives the page its quality badge. */
export type UpdateTranslations = {
    format: number;
    entries: Record<string, string>;
};

/** Where a locale's translations live, beside its other generated bundles. */
export function updatesBundlePath(locale: string): string {
    return `/locales/${locale}/${locale}-updates.json`;
}

/** Every translatable text in a release, in reading order. */
export function releaseTexts(release: UpdateRelease): UpdateText[] {
    const texts: UpdateText[] = [];
    if (release.summary !== null) texts.push(release.summary);
    for (const kind of UpdateSectionKinds) {
        texts.push(...release.changes[kind]);
        const summary = release.summaries[kind];
        if (summary !== null) texts.push(summary);
    }
    return texts.filter((text) => text.markup !== '');
}

/**
 * Every translatable id in the bundle, paired with its English markup.
 *
 * Only **dated** releases are included, because those are the only ones the
 * page renders — `parseChangelog` also produces objects for the legacy
 * `## 0.16.38` headings that carry no date, and translating prose no reader can
 * reach is the one cost this design exists to avoid.
 */
export function bundleTexts(bundle: UpdatesBundle): Map<string, string> {
    const texts = new Map<string, string>();
    for (const release of bundle.updates) {
        if (release.date === null) continue;
        for (const text of releaseTexts(release))
            texts.set(text.id, text.markup);
    }
    return texts;
}

/**
 * Every id the structural bundle carries, dated releases included or not.
 *
 * This is the set a locale's translations are pruned against, and it is
 * deliberately wider than `bundleTexts`: an entry under an undated heading is
 * never bought, but if one somehow has a translation, an id that still names
 * real content is not an orphan and dropping it would throw work away.
 */
export function allBundleIds(bundle: UpdatesBundle): Set<string> {
    const ids = new Set<string>();
    for (const release of bundle.updates)
        for (const text of releaseTexts(release)) ids.add(text.id);
    return ids;
}

/** The prefix that routes a localization edit to a locale's updates bundle,
 *  the way `tutorial` routes one to its tutorial file. */
export const UpdatesKeyPrefix = 'updates';

/** Override key for one changelog entry's markup.
 *
 * The path after the prefix is the path *within* the bundle, so the server
 * needs no special case: stripping `updates.` leaves `entries.<id>`, which
 * `setAtPath` walks like any other. Ids never start with a digit, so
 * `parseOverrideKey` can't mistake one for an array index. */
export function updateTextPath(id: string): string {
    return `${UpdatesKeyPrefix}.entries.${id}`;
}

/** True if a key is a changelog-text override rather than a UI locale edit. */
export function isUpdatesKey(key: string): boolean {
    return key.startsWith(`${UpdatesKeyPrefix}.`);
}
