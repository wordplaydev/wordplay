<script lang="ts">
    import Options from '@components/widgets/Options.svelte';
    import { locales } from '@db/Database';
    import type Locale from '@locale/Locale';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import { getLocaleLanguageName } from '@locale/LocaleText';

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
        },
        ...options.map((locale) => {
            const localeString = localeToString(locale);
            return {
                value: localeString,
                label: localeString
                    ? (getLocaleLanguageName(locale) ?? '—')
                    : '—',
            };
        }),
    ]}
    change={(value) =>
        change(value === undefined ? null : (stringToLocale(value) ?? null))}
></Options>
