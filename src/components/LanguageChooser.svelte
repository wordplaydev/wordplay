<script lang="ts">
    import { project } from '../models/stores';
    import type LanguageCode from '../translation/LanguageCode';
    import { getLanguageName, Languages } from '../translation/LanguageCode';
    import SupportedTranslations, {
        preferredLanguages,
        writingLayout,
    } from '../translation/translations';

    $: languageChoices = Array.from(
        new Set([
            ...(Object.keys(Languages) as LanguageCode[]),
            ...($project === undefined ? [] : $project.getLanguages()),
        ])
    );

    const supportedLanguages = SupportedTranslations.map((t) => t.language);

    function toggle(language: LanguageCode) {
        preferredLanguages.set(
            $preferredLanguages.includes(language)
                ? [
                      // Remove
                      ...$preferredLanguages.slice(
                          0,
                          $preferredLanguages.indexOf(language)
                      ),
                      ...$preferredLanguages.slice(
                          $preferredLanguages.indexOf(language) + 1
                      ),
                  ]
                : // Add
                  [...$preferredLanguages, language]
        );

        // Set the layout and direction based on the preferred language.
        if ($preferredLanguages.length > 0) {
            writingLayout.set(
                Languages[$preferredLanguages[0]].layout ?? 'horizontal-tb'
            );
        }
    }
</script>

<div class="languages">
    {#each languageChoices as lang}
        <span
            class="language"
            class:supported={supportedLanguages.includes(lang)}
            class:selected={$preferredLanguages.includes(lang)}
            tabIndex="0"
            on:click|stopPropagation={() => toggle(lang)}
            on:keydown={(event) =>
                event.key === ' ' || event.key === 'Enter'
                    ? toggle(lang)
                    : undefined}>{getLanguageName(lang)}</span
        >
    {/each}
</div>

<style>
    .languages {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
    }

    .language {
        cursor: pointer;
        display: inline-block;
        margin: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
    }

    .supported {
        font-weight: bold;
    }

    .language.selected {
        text-decoration: underline;
        text-decoration-color: var(--wordplay-highlight);
        text-decoration-thickness: var(--wordplay-focus-width);
    }
</style>
