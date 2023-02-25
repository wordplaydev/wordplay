<svelte:options immutable={true} />

<script lang="ts">
    import {
        preferredLanguages,
        // preferredStyle,
        preferredTranslations,
        // type LanguageStyle,
    } from '@translation/translations';
    import { getLanguageName } from '@translation/LanguageCode';
    import LanguageChooser from '../project/LanguageChooser.svelte';
    import LayoutChooser from '../project/LayoutChooser.svelte';
    import Button from '../widgets/Button.svelte';

    // let style: LanguageStyle;

    let collapsed = true;
    let element: HTMLElement;

    // function changeStyle() {
    //     preferredStyle.set(style);
    // }

    function toggle() {
        collapsed = !collapsed;
        element?.focus();
    }
</script>

<div
    class="settings"
    class:expanded={!collapsed}
    on:keydown={(event) =>
        event.key === 'Escape' ? (collapsed = true) : undefined}
>
    {#if !collapsed}
        <div class="language-preferences" bind:this={element} tabIndex="0">
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
        <Button
            tip={$preferredTranslations[0].ui.tooltip.language}
            action={toggle}
        >
            <span class="chosen">
                {#each $preferredLanguages as lang, index}{#if index > 0}+{/if}<span
                        class="language">{getLanguageName(lang)}</span
                    >{/each}
                <!-- {#if $preferredStyle === 'cs'}<small
                    ><em>{styleDescriptions['cs']}</em></small
                >{/if} -->
            </span>
        </Button>
    {/if}
</div>

<style>
    .settings.expanded {
        position: fixed;
        bottom: 0;
        right: 0;

        display: flex;
        justify-content: center;
        align-items: end;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        z-index: 3;
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
        gap: var(--wordplay-spacing);
    }
</style>
