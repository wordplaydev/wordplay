<svelte:options immutable={true} />

<script lang="ts">
    import {
        preferredLanguages,
        preferredStyle,
        type LanguageStyle,
    } from '../translation/translations';
    import { project, updateProject } from '../models/stores';
    import { getLanguageName } from '../translation/LanguageCode';
    import LanguageChooser from './LanguageChooser.svelte';
    import LayoutChooser from './LayoutChooser.svelte';
    import Control from './Control.svelte';

    let style: LanguageStyle;

    let collapsed = true;

    function changeStyle() {
        preferredStyle.set(style);
    }

    function toggle() {
        collapsed = !collapsed;
    }

    function exit() {
        updateProject(undefined);
    }
</script>

<div class="settings">
    <Control selected={toggle}>
        {#if !collapsed}
            <div class="language-preferences">
                <!-- <label for="style">style</label> -->
                <!-- Disabled while we decide whether to keep this feature. -->
                <!-- <select
                    style="display:none"
                    id="style"
                    bind:value={style}
                    on:change={changeStyle}
                >
                    {#each Object.entries(styleDescriptions) as [style, description]}
                        <option value={style}>{description}</option>
                    {/each}
                </select> -->
                <LanguageChooser />
                <LayoutChooser />
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
    </Control>
    {#if $project}
        <Control selected={exit}>❌</Control>
    {/if}
</div>

<style>
    .settings {
        position: fixed;
        bottom: 0;
        right: 0;

        display: flex;
        justify-content: center;
        align-items: end;

        z-index: var(--wordplay-layer-controls);
    }

    .preferred {
        display: flex;
        gap: var(--wordplay-spacing);
        cursor: pointer;
    }

    .language-preferences {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>
