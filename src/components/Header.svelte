<script lang="ts">
    import { getContext } from 'svelte';
    import type { Writable } from 'svelte/store';
    import { examples, makeProject, type Stuff } from '../examples/examples';
    import { updateProject } from '../models/stores';
    import type LanguageCode from '../nodes/LanguageCode';
    import { languageCodeToLanguage, SupportedLanguages } from '../nodes/LanguageCode';

    let example: Stuff;
    let language: LanguageCode;
    $: languages = getContext<Writable<LanguageCode[]>>("languages")

    function changeProject() {
        updateProject(makeProject(example));
    }

    function changeLanguage() {
        languages.set([language]);
    }

</script>

<div>
    Wordplay
    <select bind:value={example} on:change={changeProject}>
        {#each examples as example }
            <option value={example}>{example.name}</option>
        {/each}
    </select>
    <select bind:value={language} on:change={changeLanguage}>
        {#each SupportedLanguages as lang }
            <option value={lang}>{languageCodeToLanguage[lang]}</option>
        {/each}
    </select>
</div>

<style>
    div {
        width: 100%;
        height: auto;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        box-sizing: border-box;
    }
</style>