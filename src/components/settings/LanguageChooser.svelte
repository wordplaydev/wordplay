<svelte:options immutable={true} />

<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import type LanguageCode from '@locale/LanguageCode';
    import { getLanguageName, Languages } from '@locale/LanguageCode';
    import SupportedLocales from '@locale/locales';
    import { tick } from 'svelte';
    import { clickOutside } from '../app/clickOutside';
    import { creator } from '../../db/Creator';

    let collapsed = true;
    let element: HTMLElement;

    const supportedLanguages = SupportedLocales.map((t) => t.language);

    // The choices are all the languages, sorted in English alphabetical order, with supported languages first
    $: languageChoices = [
        ...supportedLanguages,
        ...Array.from(
            new Set([...(Object.keys(Languages) as LanguageCode[])])
        ).filter((lang) => !supportedLanguages.includes(lang)),
    ];

    function select(language: LanguageCode, append: boolean) {
        let languages = $creator.getLanguages();
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

        // Collapse.
        collapsed = true;
    }

    async function toggle() {
        collapsed = !collapsed;
        await tick();
        element?.focus();
    }
</script>

<div
    class="settings"
    class:expanded={!collapsed}
    use:clickOutside
    on:outclick={() => (collapsed = true)}
    on:keydown={(event) =>
        event.key === 'Escape' ? (collapsed = true) : undefined}
    tabIndex="0"
    bind:this={element}
>
    {#if !collapsed}
        <div class="language-preferences">
            <div class="languages">
                {#each languageChoices as lang}
                    {@const supported = supportedLanguages.includes(lang)}
                    <span
                        class="language"
                        class:supported
                        class:selected={$creator.getLanguages().includes(lang)}
                        tabIndex={0}
                        on:pointerdown|stopPropagation={(event) =>
                            select(lang, event.shiftKey)}
                        on:keydown={(event) =>
                            event.key === ' ' || event.key === 'Enter'
                                ? select(lang, event.shiftKey)
                                : undefined}>{getLanguageName(lang)}</span
                    >
                {/each}
            </div>
        </div>
    {:else}
        <Button tip={$creator.getLocale().ui.tooltip.language} action={toggle}>
            <span class="chosen">
                {#each $creator.getLanguages() as lang, index}{#if index > 0}+{/if}<span
                        class="language supported">{getLanguageName(lang)}</span
                    >{/each}
            </span>
        </Button>
    {/if}
</div>

<style>
    .settings {
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .settings.expanded {
        position: fixed;
        bottom: 0;
        right: 0;

        display: flex;
        justify-content: center;
        align-items: end;
        background: var(--wordplay-background);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        z-index: 3;
        padding: var(--wordplay-spacing);
        user-select: none;
    }

    .language-preferences {
        display: flex;
        flex-direction: column;
        align-items: center;
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
