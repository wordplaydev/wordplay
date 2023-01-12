<svelte:options immutable={true} />

<script lang="ts">
    import {
        preferredLanguages,
        preferredStyle,
        styleDescriptions,
        type LanguageStyle,
    } from '../translation/translations';
    import { examples, makeProject, type Stuff } from '../examples/examples';
    import { updateProject } from '../models/stores';
    import { getLanguageName } from '../translation/LanguageCode';
    import LanguageChooser from './LanguageChooser.svelte';

    let example: Stuff;
    let style: LanguageStyle;

    let collapsed = true;

    function changeProject() {
        updateProject(makeProject(example));
    }

    function changeStyle() {
        preferredStyle.set(style);
    }

    function toggle() {
        collapsed = !collapsed;
    }
</script>

<div class="settings" class:collapsed>
    {#if !collapsed}
        <div class="controls">
            <select bind:value={example} on:change={changeProject}>
                {#each examples as example}
                    <option value={example}>{example.name}</option>
                {/each}
            </select>
            <!-- <label for="style">style</label> -->
            <!-- Disabled while we decide whether to keep this feature. -->
            <select
                style="display:none"
                id="style"
                bind:value={style}
                on:change={changeStyle}
            >
                {#each Object.entries(styleDescriptions) as [style, description]}
                    <option value={style}>{description}</option>
                {/each}
            </select>
            <LanguageChooser />
        </div>
    {:else}
        <div class="preferred">
            {#each $preferredLanguages as lang}<span class="choice"
                    >{getLanguageName(lang)}</span
                >{/each}
        </div>
        <!-- {#if $preferredStyle === 'cs'}<small
                ><em>{styleDescriptions['cs']}</em></small
            >{/if} -->
    {/if}
    <span
        class="gear"
        tabIndex="0"
        on:click={toggle}
        on:keydown={(event) =>
            event.key === ' ' || event.key === 'Enter' ? toggle() : undefined}
    >
        ⚙
    </span>
</div>

<style>
    .settings {
        position: fixed;
        bottom: 0;
        right: 0;

        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
        text-align: center;

        display: flex;
        justify-content: center;
        align-items: end;
        gap: var(--wordplay-spacing);

        z-index: var(--wordplay-layer-controls);
        border-radius: var(--wordplay-border-radius);
    }

    .preferred {
        display: flex;
        gap: var(--wordplay-spacing);
    }

    .gear {
        cursor: pointer;
        min-width: 1em;
        min-height: 1em;
    }

    .gear:hover {
        font-weight: bold;
    }

    .gear:focus {
        outline: none;
    }

    .settings:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }
</style>
