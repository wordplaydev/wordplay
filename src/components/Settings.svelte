<svelte:options immutable={true} />

<script lang="ts">
    import { translations } from '../translations/translations';
    import { examples, makeProject, type Stuff } from '../examples/examples';
    import { updateProject } from '../models/stores';
    import SupportedTranslations from '../translations/SupportedTranslations';
    import type Translation from '../translations/Translation';

    let example: Stuff;
    let language: Translation;

    let collapsed = true;

    function changeProject() {
        updateProject(makeProject(example));
    }

    function changeLanguage() {
        translations.set([language]);
    }

    function show() {
        collapsed = false;
    }
    function hide() {
        collapsed = true;
    }
</script>

<div
    class="settings"
    class:collapsed
    tabIndex="0"
    on:mouseover={show}
    on:mouseleave={hide}
    on:focus={show}
    on:focusin={show}
    on:focusout={hide}
>
    {#if collapsed}
        ⚙
    {:else}
        <select bind:value={example} on:change={changeProject}>
            {#each examples as example}
                <option value={example}>{example.name}</option>
            {/each}
        </select>
        <select bind:value={language} on:change={changeLanguage}>
            {#each SupportedTranslations as translation}
                <option value={translation}
                    >{`${translation.language}#${translation.style}`}</option
                >
            {/each}
        </select>
    {/if}
</div>

<style>
    .settings {
        position: fixed;
        bottom: var(--wordplay-spacing);
        right: var(--wordplay-spacing);

        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
        border-radius: var(--wordplay-border-radius);
        text-align: center;

        display: flex;
        justify-content: center;
        align-items: center;

        z-index: var(--wordplay-layer-controls);
    }

    .settings.collapsed {
        border-radius: 50%;
        min-width: 3em;
        min-height: 3em;
    }

    .settings:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }
</style>
