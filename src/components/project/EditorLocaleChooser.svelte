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

    /** "$count languages" with the count concretized. Shown as the
     *  placeholder/no-filter option so users see how many languages are
     *  currently visible in the editor. */
    let placeholder = $derived(
        $locales
            .concretize((l) => l.ui.source.options.locale.all, {
                count: options.length,
            })
            .toText(),
    );
</script>

<Options
    id="code-locale"
    value={locale ? localeToString(locale) : undefined}
    label={(l) => l.ui.source.options.locale.tip}
    width="auto"
    options={[
        {
            value: undefined,
            label: placeholder,
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
        localized,
    )}{#if option.locale === null}{@render localized(
                option.label,
            )}{:else}<LocaleName locale={option.locale}
            ></LocaleName>{/if}{/snippet}
</Options>
