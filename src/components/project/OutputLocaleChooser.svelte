<script lang="ts">
    import Options from '@components/widgets/Options.svelte';
    import { locales } from '@db/Database';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import type Locale from '@locale/Locale';
    import { getLocaleLanguageName } from '@locale/LocaleText';
    import { LOCALE_SYMBOL } from '@parser/Symbols';
    import { withMonoEmoji } from '../../unicode/emoji';

    interface Props {
        localesUsed?: Locale[];
        locale?: Locale | undefined;
        change: (value: Locale | undefined) => void;
    }

    let { localesUsed = [], locale = undefined, change }: Props = $props();
</script>

<!-- svelte-ignore a11y_label_has_associated_control -->
<label class="output-locale"
    >{withMonoEmoji(LOCALE_SYMBOL)}
    <Options
        id="output-locale"
        value={locale === undefined ? undefined : localeToString(locale)}
        label={$locales.get((l) => l.ui.output.options.locale)}
        width="auto"
        options={[
            {
                value: undefined,
                label: '—',
            },
            ...localesUsed.map((l) => {
                const label = localeToString(l);
                return {
                    value: label,
                    label: label ? (getLocaleLanguageName(label) ?? '—') : '—',
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
