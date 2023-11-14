<script lang="ts">
    import type LanguageCode from '../../locale/LanguageCode';
    import { Languages } from '../../locale/LanguageCode';
    import type Project from '../../models/Project';
    import { getKeyboardEditIdle } from './Contexts';

    export let project: Project;

    const idle = getKeyboardEditIdle();
    let languages: LanguageCode[] = [];

    $: if (idle) languages = project.getLanguagesUsed();
</script>

<span class="languages">
    {#each languages as language, index}<span class="language"
            >{#if index > 0} + {/if}{Languages[language].name}</span
        >{/each}
</span>

<style>
    .languages {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        white-space: nowrap;
        gap: var(--wordplay-spacing);
        font-size: medium;
        margin-inline-start: auto;
        color: var(--wordplay-inactive-color);
    }
</style>
