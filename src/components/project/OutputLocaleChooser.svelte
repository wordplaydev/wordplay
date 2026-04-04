<script lang="ts">
    import LocaleName from '@components/settings/LocaleName.svelte';
    import Options from '@components/widgets/Options.svelte';
    import type Locale from '@locale/Locale';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import { getLanguageLocalDescription } from '@locale/LocaleText';
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
                label: (l) => l.ui.output.options.default,
            },
            ...localesUsed.map((l) => ({
                value: localeToString(l),
                label: () => getLanguageLocalDescription(l),
            })),
        ]}
        change={(value) =>
            change(value === undefined ? undefined : stringToLocale(value))}
    >
        {#snippet item(option, localized)}
            {#if option.value === undefined}
                {@render localized(option.label)}
            {:else}
                <LocaleName locale={option.value}></LocaleName>
            {/if}
        {/snippet}
    </Options></label
>

<style>
    .output-locale {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
    }
</style>
