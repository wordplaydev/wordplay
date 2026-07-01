<script module lang="ts">
    import type LanguageCode from '@locale/LanguageCode';
    import { Languages } from '@locale/LanguageCode';
    import type { Locale } from '@locale/Locale';
    import { Regions } from '@locale/Regions';

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
            ]
                .join(' ')
                .toLocaleLowerCase(languages);
            return haystack.includes(q);
        });
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
