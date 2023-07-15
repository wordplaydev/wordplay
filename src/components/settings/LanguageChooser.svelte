<svelte:options />

<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import type LanguageCode from '@locale/LanguageCode';
    import {
        getLanguageName,
        Languages,
        PossibleLanguages,
    } from '@locale/LanguageCode';
    import { tick } from 'svelte';
    import { creator } from '../../db/Creator';
    import SupportedLanguages from '@locale/SupportedLanguages';
    import ExternalLink from '../app/ExternalLink.svelte';
    import concretize from '../../locale/concretize';

    let collapsed = true;
    let dialog: HTMLDialogElement;

    $: languages = $creator.getLanguages();

    function select(language: LanguageCode) {
        languages = languages.includes(language)
            ? languages.length === 1
                ? languages
                : [
                      // Remove
                      ...languages.slice(0, languages.indexOf(language)),
                      ...languages.slice(languages.indexOf(language) + 1),
                  ]
            : [language, ...languages];

        // Set the layout and direction based on the preferred language.
        if (languages.length > 0) {
            $creator.setWritingLayout(
                Languages[languages[0]].layout ?? 'horizontal-tb'
            );
            // Save it.
            $creator.setLanguages(languages);
        }
    }

    async function toggle() {
        collapsed = !collapsed;
        dialog.showModal();
        await tick();
        dialog?.focus();
    }
</script>

<dialog bind:this={dialog}>
    <h1
        >{concretize(
            $creator.getLocale(),
            $creator.getLocale().ui.header.selectedLocales
        ).toText()}</h1
    >
    <div class="languages">
        {#each languages as lang}
            <span role="button" class="language supported">
                <Button
                    action={() => select(lang)}
                    enabled={languages.length > 1}
                    tip={$creator.getLocale().ui.tooltip.removeLanguage}
                    >{getLanguageName(lang)}<sub>{lang}</sub>
                    {#if languages.length > 1}
                        -{/if}</Button
                ></span
            >
        {/each}
    </div>
    <h1
        >{concretize(
            $creator.getLocale(),
            $creator.getLocale().ui.header.supportedLocales
        ).toText()}</h1
    >
    <div class="languages">
        {#each SupportedLanguages.filter((lang) => !languages.includes(lang)) as lang}
            <span class="language supported">
                <Button
                    action={() => select(lang)}
                    tip={$creator.getLocale().ui.tooltip.addLanguage}
                    >{getLanguageName(lang)}<sub>{lang}</sub> +</Button
                ></span
            >
        {:else}&mdash;
        {/each}
    </div>
    <h1
        ><ExternalLink
            to="https://github.com/amyjko/wordplay/blob/main/CONTRIBUTING.md#localization"
            >{concretize(
                $creator.getLocale(),
                $creator.getLocale().ui.header.helpLocalize
            ).toText()}</ExternalLink
        ></h1
    >
    <div class="languages">
        {#each PossibleLanguages.filter((lang) => !SupportedLanguages.includes(lang)) as lang}
            <span class="language" class:supported={false}
                >{getLanguageName(lang)}<sub>{lang}</sub></span
            >
        {/each}
    </div>
    <div class="close">
        <Button
            tip={$creator.getLocale().ui.tooltip.back}
            action={() => dialog.close()}>❌</Button
        >
    </div>
</dialog>
<Button tip={$creator.getLocale().ui.tooltip.changeLanguage} action={toggle}>
    <span class="chosen">
        {#each languages as lang, index}{#if index > 0}+{/if}<span
                class="language supported">{getLanguageName(lang)}</span
            >{/each}
    </span>
</Button>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: calc(2 * var(--wordplay-spacing));
    }

    .close {
        position: absolute;
        top: calc(2 * var(--wordplay-spacing));
        right: calc(2 * var(--wordplay-spacing));
    }

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

    .language {
        transition-property: transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .language:not(.supported) {
        opacity: 0.6;
        cursor: default;
    }
</style>
