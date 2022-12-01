<script lang="ts">
    import { getLanguages } from '../editor/util/Contexts';
    import { examples, makeProject, type Stuff } from '../examples/examples';
    import { project, updateProject } from '../models/stores';
    import type LanguageCode from '../nodes/LanguageCode';
    import { languageCodeToLanguage, SupportedLanguages } from '../nodes/LanguageCode';
    import { WRITE } from '../nodes/Translations';
    import Button from './Button.svelte';

    let example: Stuff;
    let language: LanguageCode;
    let languages = getLanguages();

    function changeProject() {
        updateProject(makeProject(example));
    }

    function changeLanguage() {
        languages.set([language]);
    }

    function reset() {
        updateProject($project.clone());
    }

</script>

<div class="header">
    <h1>Wordplay</h1>
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
    <Button
        label={{ eng: "restart", "😀": WRITE }}
        tip={{ eng: "Restart the evaluation of the project from the beginning.", "😀": WRITE }}
        action={reset}
    />
</div>

<style>
    .header {
        height: auto;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        box-sizing: border-box;
    }

    h1 {
        display: inline;
    }

</style>