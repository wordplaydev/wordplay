<svelte:options immutable={true} />

<script lang="ts">
    import type { ToggleText } from '../../locale/UITexts';
    import { toShortcut, type Command } from '../editor/util/Commands';
    import CommandHint from './CommandHint.svelte';

    export let tips: ToggleText;
    export let on: boolean;
    export let toggle: () => void;
    export let active = true;
    export let uiid: string | undefined = undefined;
    export let command: Command | undefined = undefined;
    export let background = false;

    async function doToggle(event: Event) {
        if (active) {
            toggle();
            event?.stopPropagation();
        }
    }

    $: title = `${on ? tips.on : tips.off}${
        command ? ' (' + toShortcut(command) + ')' : ''
    }`;
</script>

<!-- 
    Note: we don't make the button inactive using "disabled" because that makes it invisible to screen readers. 
    Note: we prevent mouse down default to avoid stealing keyboard focus. 
-->
<button
    type="button"
    class:background
    data-uiid={uiid}
    class:on
    {title}
    aria-label={title}
    aria-disabled={!active}
    aria-pressed={on}
    on:dblclick|stopPropagation
    on:mousedown|preventDefault
    on:click={(event) =>
        event.button === 0 && active ? doToggle(event) : undefined}
>
    {#if command}<CommandHint {command} />{/if}
    <div class="icon">
        <slot />
    </div>
</button>

<style>
    button {
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        font-weight: var(--wordplay-font-weight);
        font-style: inherit;
        transform-origin: center;
        user-select: none;
        border: none;
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
        color: currentColor;
        stroke: currentColor;
        fill: var(--wordplay-background);
        padding: calc(var(--wordplay-spacing) / 2);
        cursor: pointer;
        width: fit-content;
        max-width: 10em;
        height: var(--wordplay-widget-height);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: transform calc(var(--animation-factor) * 200ms);
        line-height: 1;
        /* Don't let it shrink smaller than its width */
        flex-shrink: 0;

        /** Allows for command hint layout */
        position: relative;
    }

    .background {
        background: var(--wordplay-alternating-color);
        color: var(--wordplay-foreground);
    }

    button.on {
        color: var(--wordplay-foreground);
        stroke: var(--wordplay-background);
        fill: var(--wordplay-background);
        box-shadow: inset 1px 2px var(--wordplay-chrome);
    }

    button.on .icon {
        transform: scale(0.9);
    }

    button:not(.on):hover .icon {
        transform: scale(1.1);
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
