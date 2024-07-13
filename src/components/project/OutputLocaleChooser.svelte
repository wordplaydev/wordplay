<script lang="ts">
    import Options from '@components/widgets/Options.svelte';
    import { locales } from '@db/Database';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import type Locale from '@locale/Locale';

    export let localesUsed: Locale[] = [];
    export let locale: Locale | undefined = undefined;
    export let change: (value: Locale | undefined) => void;
</script>

<!-- svelte-ignore a11y-label-has-associated-control -->
<label class="output-locale"
    >🌐 <Options
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
                    label,
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
