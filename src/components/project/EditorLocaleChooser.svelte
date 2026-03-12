<script lang="ts">
    import LocaleName from '@components/settings/LocaleName.svelte';
    import Options from '@components/widgets/Options.svelte';
    import { locales } from '@db/Database';
    import type Locale from '@locale/Locale';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import { getLanguageLocalDescription } from '@locale/LocaleText';

    let {
        locale,
        options,
        change,
    }: {
        locale: Locale | null;
        options: Locale[];
        change: (locale: Locale | null) => void;
    } = $props();
</script>

<Options
    id="code-locale"
    value={locale ? localeToString(locale) : undefined}
    label={(l) => l.ui.source.options.locale.tip}
    width="auto"
    options={[
        {
            value: undefined,
            label: $locales.get((l) => l.ui.source.options.locale.all),
            locale: null,
        },
        ...options.map((locale) => {
            return {
                value: localeToString(locale),
                label: getLanguageLocalDescription(locale),
                locale: locale,
            };
        }),
    ]}
    change={(value) =>
        change(value === undefined ? null : (stringToLocale(value) ?? null))}
>
    {#snippet item(
        option,
    )}{#if option.locale === null}{option.label}{:else}<LocaleName
                locale={option.locale}
            ></LocaleName>{/if}{/snippet}
</Options>
