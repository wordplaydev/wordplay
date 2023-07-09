<svelte:options />

<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import type LanguageCode from '@locale/LanguageCode';
    import { getLanguageName, Languages } from '@locale/LanguageCode';
    import SupportedLocales from '@locale/locales';
    import { tick } from 'svelte';
    import { creator } from '../../db/Creator';

    let collapsed = true;
    let element: HTMLDialogElement;

    $: languages = $creator.getLanguages();

    // The choices are all the languages, sorted in English alphabetical order, with supported languages first
    $: languageChoices = [
        ...SupportedLocales,
        ...Array.from(
            new Set([...(Object.keys(Languages) as LanguageCode[])])
        ).filter((lang) => !SupportedLocales.includes(lang)),
    ];

    function select(language: LanguageCode, append: boolean) {
        const selected = languages.includes(language);
        languages = selected
            ? languages.length === 1
                ? // If it's already selected, and there's only one, keep it the same.
                  languages
                : // Otherwise, remove it.
                  [
                      // Remove
                      ...languages.slice(0, languages.indexOf(language)),
                      ...languages.slice(languages.indexOf(language) + 1),
                  ]
            : // If replacing, just set to the given language. Otherwise add.
            append
            ? [...languages, language]
            : [language];

        // Set the layout and direction based on the preferred language.
        if (languages.length > 0) {
            $creator.setWritingLayout(
                Languages[languages[0]].layout ?? 'horizontal-tb'
            );
            // Save it.
            $creator.setLanguages(languages);
        }

        // Hide the dialog.
        element.close();
    }

    async function toggle() {
        collapsed = !collapsed;
        element.showModal();
        await tick();
        element?.focus();
    }
</script>

<dialog bind:this={element} class="language-preferences">
    <div class="languages">
        {#each languageChoices as lang}
            {@const supported = SupportedLocales.includes(lang)}
            <span
                role="button"
                tabindex={0}
                class="language"
                class:supported
                class:selected={languages.includes(lang)}
                on:pointerdown|stopPropagation={(event) =>
                    select(lang, event.shiftKey)}
                on:keydown={(event) =>
                    event.key === ' ' || event.key === 'Enter'
                        ? select(lang, event.shiftKey)
                        : undefined}>{getLanguageName(lang)}</span
            >
        {/each}
    </div>
</dialog>
<Button tip={$creator.getLocale().ui.tooltip.language} action={toggle}>
    <span class="chosen">
        {#each languages as lang, index}{#if index > 0}+{/if}<span
                class="language supported">{getLanguageName(lang)}</span
            >{/each}
    </span>
</Button>

<style>
    .language-preferences {
        border-radius: var(--wordplay-border-radius);
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
    }

    .language {
        display: inline-block;
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
    }

    .language {
        transition-property: transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .language.supported {
        text-decoration: underline;
    }

    .language.selected {
        font-weight: bold;
    }
</style>
