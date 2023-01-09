<script lang="ts">
    import { project } from '../models/stores';
    import type LanguageCode from '../translations/LanguageCode';
    import { getLanguageName } from '../translations/LanguageCode';
    import SupportedTranslations, {
        preferredLanguages,
    } from '../translations/translations';

    $: languageChoices = Array.from(
        new Set([
            ...SupportedTranslations.map((t) => t.language),
            ...$project.getLanguages(),
        ])
    );

    function toggle(language: LanguageCode) {
        preferredLanguages.set(
            $preferredLanguages.includes(language)
                ? [
                      ...$preferredLanguages.slice(
                          0,
                          $preferredLanguages.indexOf(language)
                      ),
                      ...$preferredLanguages.slice(
                          $preferredLanguages.indexOf(language) + 1
                      ),
                  ]
                : [...$preferredLanguages, language]
        );
    }
</script>

<div class="languages">
    {#each languageChoices as lang}
        <span
            class="language"
            class:selected={$preferredLanguages.includes(lang)}
            on:click={() => toggle(lang)}
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
    }

    .language {
        cursor: pointer;
        display: inline-block;
        margin: var(--wordplay-spacing);
        opacity: 0.5;
    }

    .language.selected {
        opacity: 1;
    }
</style>
