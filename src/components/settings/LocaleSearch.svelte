<script module lang="ts">
    import type LanguageCode from '@locale/LanguageCode';
    import { Languages } from '@locale/LanguageCode';
    import type { Locale } from '@locale/Locale';
    import { RegionCodes, Regions, type RegionCode } from '@locale/Regions';
    import { foldTagName, getRegionName } from '@locale/tagNames';

    /** Filter a list of locale-bearing items by a query that matches an item's
     *  native name, Latin name, region code, or region name. Matching is
     *  case-insensitive per the given UI languages. Returns every item when the
     *  query is empty, and drops items whose locale can't be resolved. */
    export function filterLocalesByQuery<Item>(
        items: Item[],
        query: string,
        toLocale: (item: Item) => Locale | undefined,
        languages: LanguageCode[],
    ): Item[] {
        const q = query.trim().toLocaleLowerCase(languages);
        if (q.length === 0) return items;
        return items.filter((item) => {
            const locale = toLocale(item);
            if (locale === undefined) return false;
            const info = Languages[locale.language];
            const haystack = [
                info?.name ?? '', // native name, e.g. "español", "日本語"
                info?.en ?? '', // Latin name, e.g. "Spanish"
                ...locale.regions, // region code, e.g. "MX"
                ...locale.regions.map((r) => Regions[r]?.en ?? ''), // region name, e.g. "Mexico"
                ...locale.regions.map(getRegionName), // its own name, e.g. "México"
            ]
                .join(' ')
                .toLocaleLowerCase(languages);
            return haystack.includes(q);
        });
    }
    /** One entry of a language or region dropdown, matching `Options`' shape. */
    export type CodeOption = { value: string; label: string };

    /**
     * Prefix matching for the request-a-language form's two dropdowns.
     *
     * The form offers every ISO language and region, not the supported locales, so
     * `filterLocalesByQuery` — which matches whole `Locale`s by substring — doesn't apply
     * here. Matching is by *prefix* rather than substring (per #1256) so that typing a few
     * letters lands on the language someone means instead of every language whose English
     * name happens to contain those letters: "arab" should reach Arabic, not also Moroccan.
     */

    /** Casefold with the reader's own languages, as `filterLocalesByQuery` does, so
     *  locale-specific casing (Turkish dotted/dotless i) folds the way they expect. */
    function fold(text: string, languages: LanguageCode[]): string {
        return text.toLocaleLowerCase(languages);
    }

    /**
     * How well `query` matches one candidate's code, English name, and native name, as a
     * rank where lower is better, or undefined for no match. An exact code beats a name,
     * and the English name beats the native one because the query is typed with whatever
     * keyboard the reader has — someone hunting for Japanese is far likelier to type
     * "japan" than "日本語".
     */
    function rank(
        query: string,
        code: string,
        en: string,
        native: string | undefined,
        languages: LanguageCode[],
    ): number | undefined {
        const folded = fold(code, languages);
        if (folded === query) return 0;
        if (folded.startsWith(query)) return 1;
        if (fold(en, languages).startsWith(query)) return 2;
        if (native !== undefined && fold(native, languages).startsWith(query))
            return 3;
        // Last, and lowest, the tag resolver's own fold: it ignores accents and
        // spaces, so "espanol" reaches Español and "cotedivoire" reaches Côte
        // d'Ivoire, on the keyboard the reader actually has.
        const loose = foldTagName(query);
        if (
            loose.length > 0 &&
            [en, native].some(
                (name) =>
                    name !== undefined && foldTagName(name).startsWith(loose),
            )
        )
            return 4;
        return undefined;
    }

    /** Sort by match rank, then by speakers descending so the language most people read
     *  wins a tie, then by label so the order is stable for the many with no count. */
    function byRankThenReach<
        Item extends { rank: number; reach: number; label: string },
    >(a: Item, b: Item): number {
        return (
            a.rank - b.rank ||
            b.reach - a.reach ||
            a.label.localeCompare(b.label)
        );
    }

    // Built once. Both tables are static, and re-sorting a few hundred entries on
    // every keystroke of the filter is pure waste.
    let allLanguages: CodeOption[] | undefined = undefined;
    let allRegions: CodeOption[] | undefined = undefined;

    /** Every language, as dropdown options ordered by native name. */
    export function allLanguageOptions(): CodeOption[] {
        return (allLanguages ??= Object.entries(Languages)
            .map(([code, meta]) => ({
                value: code,
                label: `${meta.name} (${meta.en})`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)));
    }

    /** Every region, as dropdown options ordered by name. Labelled the way
     *  languages are — the region's own name, then the English one — so a
     *  reader sees "México (Mexico)" rather than a bare code. */
    export function allRegionOptions(): CodeOption[] {
        return (allRegions ??= RegionCodes.map((code) => ({
            value: code,
            label: regionLabel(code, Regions[code].en),
        })).sort((a, b) => a.label.localeCompare(b.label)));
    }

    /** "México (Mexico)", or just "Mexico" where the two are the same word. */
    function regionLabel(code: RegionCode, en: string): string {
        const name = getRegionName(code);
        return name === en ? en : `${name} (${en})`;
    }

    /** The languages `query` prefix-matches, best first. An empty query matches everything,
     *  in the dropdown's normal order, so clearing the box restores the full list. */
    export function matchLanguages(
        query: string,
        languages: LanguageCode[],
    ): CodeOption[] {
        const q = fold(query.trim(), languages);
        if (q.length === 0) return allLanguageOptions();
        return Object.entries(Languages)
            .flatMap(([code, meta]) => {
                const order = rank(q, code, meta.en, meta.name, languages);
                return order === undefined
                    ? []
                    : [
                          {
                              value: code,
                              label: `${meta.name} (${meta.en})`,
                              rank: order,
                              reach: meta.speakers ?? -1,
                          },
                      ];
            })
            .sort(byRankThenReach)
            .map(({ value, label }) => ({ value, label }));
    }

    /** The regions `query` prefix-matches, best first. Regions carry no
     *  population, so ties fall through to alphabetical order. */
    export function matchRegions(
        query: string,
        languages: LanguageCode[],
    ): CodeOption[] {
        const q = fold(query.trim(), languages);
        if (q.length === 0) return allRegionOptions();
        return RegionCodes.flatMap((code) => {
            const order = rank(
                q,
                code,
                Regions[code].en,
                getRegionName(code),
                languages,
            );
            return order === undefined
                ? []
                : [
                      {
                          value: code,
                          label: regionLabel(code, Regions[code].en),
                          rank: order,
                          reach: -1,
                      },
                  ];
        })
            .sort(byRankThenReach)
            .map(({ value, label }) => ({ value, label }));
    }

    /**
     * What a query should auto-select: the best language match, or — when the query names
     * no language at all — the best region match. One search box drives both dropdowns, so
     * "portug" fills in Portuguese and "braz" fills in Brazil (#1256). Languages win when
     * both match, since the form is primarily about a missing language.
     */
    export function bestMatch(
        query: string,
        languages: LanguageCode[],
    ): { language?: string; region?: string } {
        if (query.trim().length === 0) return {};
        const language = matchLanguages(query, languages)[0];
        if (language !== undefined) return { language: language.value };
        const region = matchRegions(query, languages)[0];
        return region === undefined ? {} : { region: region.value };
    }
</script>

<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        /** The current query text; filter items with {@link filterLocalesByQuery}. */
        query: string;
        /** A unique id for the underlying text field. */
        id: string;
        placeholder?: LocaleTextAccessor;
        description?: LocaleTextAccessor;
    }

    let {
        query = $bindable(''),
        id,
        placeholder = (l) => l.ui.dialog.locale.search.placeholder,
        description = (l) => l.ui.dialog.locale.search.description,
    }: Props = $props();
</script>

<TextField {id} {placeholder} {description} bind:text={query} />
