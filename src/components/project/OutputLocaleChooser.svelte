<script lang="ts">
    import Options from '@components/widgets/Options.svelte';
    import { locales } from '@db/Database';
    import type Locale from '@locale/Locale';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import {
        getLocaleLanguageName,
        getLocaleRegionNames,
    } from '@locale/LocaleText';
    import { LOCALE_SYMBOL } from '@parser/Symbols';

    interface Props {
        localesUsed?: Locale[];
        locale?: Locale | undefined;
        change: (value: Locale | undefined) => void;
    }

    let { localesUsed = [], locale = undefined, change }: Props = $props();
</script>

<!-- svelte-ignore a11y_label_has_associated_control -->
<label class="output-locale"
    >{LOCALE_SYMBOL}
    <Options
        id="output-locale"
        value={locale === undefined ? undefined : localeToString(locale)}
        label={(l) => l.ui.output.options.locale}
        width="auto"
        options={[
            {
                value: undefined,
                label: $locales.get((l) => l.ui.output.options.default),
            },
            ...localesUsed.map((l) => {
                const locale = localeToString(l);
                const language = getLocaleLanguageName(locale);
                const regions = getLocaleRegionNames(locale);
                return {
                    value: locale,
                    label: `${language ?? '–'}${regions.length > 0 ? ` [${regions.join('|')}]` : ''}`,
                };
            }),
        ]}
        change={(value) =>
            change(value === undefined ? undefined : stringToLocale(value))}
    ></Options></label
>

<style>
    .output-locale {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
    }
</style>
