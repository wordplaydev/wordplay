<svelte:options />

<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import { getLanguageLayout, PossibleLanguages } from '@locale/LanguageCode';
    import { config } from '../../db/Creator';
    import {
        SupportedLocales,
        getLocaleLanguage,
        type SupportedLocale,
    } from '../../locale/Locale';
    import Link from '../app/Link.svelte';
    import concretize from '../../locale/concretize';
    import Dialog from '../widgets/Dialog.svelte';
    import { toLocaleString } from '../../locale/Locale';
    import type LanguageCode from '@locale/LanguageCode';
    import LocaleName from './LocaleName.svelte';

    let show: boolean;

    $: selectedLocales = $config
        .getLocales()
        .map((locale) => toLocaleString(locale)) as SupportedLocale[];

    function select(locale: SupportedLocale) {
        selectedLocales = selectedLocales.includes(locale)
            ? selectedLocales.length === 1
                ? selectedLocales
                : [
                      // Remove
                      ...selectedLocales.slice(
                          0,
                          selectedLocales.indexOf(locale)
                      ),
                      ...selectedLocales.slice(
                          selectedLocales.indexOf(locale) + 1
                      ),
                  ]
            : [...selectedLocales, locale];

        // Set the layout and direction based on the preferred language.
        if (selectedLocales.length > 0) {
            $config.setWritingLayout(
                getLanguageLayout(
                    getLocaleLanguage(selectedLocales[0]) as LanguageCode
                )
            );
            // Save setLocales
            $config.setLocales(selectedLocales as SupportedLocale[]);
        }
    }
</script>

<Dialog bind:show>
    <h1
        >{concretize(
            $config.getLocale(),
            $config.getLocale().ui.header.selectedLocales
        ).toText()}</h1
    >
    <div class="languages">
        {#each selectedLocales as locale}
            <Button
                action={() => select(locale)}
                active={selectedLocales.length > 1}
                tip={$config.getLocale().ui.description.removeLanguage}
                >{#if selectedLocales.length > 1}
                    ⨉
                {/if}<LocaleName {locale} supported /></Button
            >
        {/each}
    </div>
    <h1
        >{concretize(
            $config.getLocale(),
            $config.getLocale().ui.header.supportedLocales
        ).toText()}</h1
    >
    <div class="languages">
        {#each SupportedLocales.filter((supported) => !selectedLocales.some((locale) => locale === supported)) as supported}
            <Button
                action={() => select(supported)}
                tip={$config.getLocale().ui.description.addLanguage}
                >+ <LocaleName locale={supported} supported /></Button
            >
        {:else}&mdash;
        {/each}
    </div>
    <h1
        ><Link
            external
            to="https://github.com/amyjko/wordplay/blob/main/CONTRIBUTING.md#localization"
            >{concretize(
                $config.getLocale(),
                $config.getLocale().ui.header.helpLocalize
            ).toText()}</Link
        ></h1
    >
    <div class="languages">
        {#each PossibleLanguages.filter((lang) => lang !== '😀' && !SupportedLocales.some((locale) => getLocaleLanguage(locale) === lang)) as lang}
            <LocaleName locale={lang} supported={false} />
        {/each}
    </div>
</Dialog>
<Button
    tip={$config.getLocale().ui.description.changeLanguage}
    action={() => (show = true)}
>
    <span class="chosen">
        {#each selectedLocales as locale, index}{#if index > 0}+{/if}<LocaleName
                {locale}
                supported
            />{/each}
    </span>
</Button>

<style>
    .chosen {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
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