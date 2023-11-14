<svelte:options />

<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import { getLanguageLayout, PossibleLanguages } from '@locale/LanguageCode';
    import { DB, locales } from '@db/Database';
    import {
        SupportedLocales,
        getLocaleLanguage,
        type SupportedLocale,
        getLocaleLanguageName,
        EventuallySupportedLocales,
    } from '../../locale/Locale';
    import Link from '../app/Link.svelte';
    import concretize from '../../locale/concretize';
    import Dialog from '../widgets/Dialog.svelte';
    import { toLocaleString } from '../../locale/Locale';
    import type LanguageCode from '@locale/LanguageCode';
    import LocaleName from './LocaleName.svelte';
    import { Settings } from '../../db/Database';

    $: selectedLocales = $locales
        .getPreferredLocales()
        .map((locale) => toLocaleString(locale)) as SupportedLocale[];

    function select(
        locale: SupportedLocale,
        action: 'remove' | 'replace' | 'add'
    ) {
        selectedLocales =
            // If removing, only remove if there's more than one.
            action === 'remove'
                ? selectedLocales.length > 1
                    ? selectedLocales.filter((l) => l !== locale)
                    : selectedLocales
                : // If replacing, just choose the single locale
                action === 'replace'
                ? [locale]
                : // Put the selected locale at the end, removing it from the beginning if included
                  [...selectedLocales.filter((l) => l !== locale), locale];

        // Set the layout and direction based on the preferred language.
        if (selectedLocales.length > 0) {
            Settings.setWritingLayout(
                getLanguageLayout(
                    getLocaleLanguage(selectedLocales[0]) as LanguageCode
                )
            );
            // Save setLocales
            DB.Locales.setLocales(selectedLocales as SupportedLocale[]);
        }
    }
</script>

<Dialog
    description={$locales.get((l) => l.ui.dialog.locale)}
    button={{
        tip: $locales.get((l) => l.ui.dialog.locale.button.show),
        label: selectedLocales.map((l) => getLocaleLanguageName(l)).join(' + '),
    }}
>
    <h2
        >{concretize(
            $locales,
            $locales.get((l) => l.ui.dialog.locale.subheader.selected)
        ).toText()}</h2
    >
    <div class="languages">
        {#each selectedLocales as selected}
            <Button
                action={() => select(selected, 'remove')}
                tip={$locales.get((l) => l.ui.dialog.locale.button.remove)}
                active={selectedLocales.length > 1}
                >{#if selectedLocales.length > 1}
                    ⨉
                {/if}<LocaleName locale={selected} supported /></Button
            >
        {/each}
    </div>
    <h2
        >{concretize(
            $locales,
            $locales.get((l) => l.ui.dialog.locale.subheader.supported)
        ).toText()}</h2
    >
    <div class="supported">
        {#each SupportedLocales.filter((supported) => !selectedLocales.some((locale) => locale === supported)) as supported}
            <div class="option">
                <Button
                    action={() => select(supported, 'replace')}
                    tip={$locales.get((l) => l.ui.dialog.locale.button.replace)}
                    ><LocaleName locale={supported} supported /></Button
                >
                <Button
                    action={() => select(supported, 'add')}
                    tip={$locales.get((l) => l.ui.dialog.locale.button.add)}
                    >+</Button
                >
            </div>
        {:else}&mdash;
        {/each}
    </div>
    <h2
        >{concretize(
            $locales,
            $locales.get((l) => l.ui.dialog.locale.subheader.coming)
        ).toText()}</h2
    >

    {#if EventuallySupportedLocales.length > 0}
        {#each EventuallySupportedLocales as supported}
            <div class="option">
                <LocaleName locale={supported} supported={false} />
            </div>
        {/each}
    {/if}

    <h2
        ><Link
            external
            to="https://github.com/wordplaydev/wordplay/wiki/localize"
            >{concretize(
                $locales,
                $locales.get((l) => l.ui.dialog.locale.subheader.help)
            ).toText()}</Link
        ></h2
    >
    <div class="languages">
        {#each PossibleLanguages.filter((lang) => lang !== '😀' && !SupportedLocales.some((locale) => getLocaleLanguage(locale) === lang)) as lang}
            <LocaleName locale={lang} supported={false} />
        {/each}
    </div>
</Dialog>

<style>
    .supported {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }

    .languages {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
    }
</style>
