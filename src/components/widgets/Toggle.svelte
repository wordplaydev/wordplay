<svelte:options immutable={true} />

<script lang="ts">
    import type { ToggleText } from '../../locale/UITexts';
    import { toShortcut, type Command } from '../editor/util/Commands';

    export let tips: ToggleText;
    export let on: boolean;
    export let toggle: () => void;
    export let active = true;
    export let uiid: string | undefined = undefined;
    export let command: Command | undefined = undefined;

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

<!-- Note that we don't make the button inactive using "disabled" because that makes
    it invisible to screen readers. -->
<button
    type="button"
    data-uiid={uiid}
    class:on
    {title}
    aria-label={title}
    aria-disabled={!active}
    aria-pressed={on}
    on:dblclick|stopPropagation
    on:pointerdown={(event) =>
        event.button === 0 && active ? doToggle(event) : undefined}
    on:keydown={(event) =>
        (event.key === 'Enter' || event.key === ' ') &&
        // Only activate with no modifiers down. Enter is used for other shortcuts.
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
            ? doToggle(event)
            : undefined}
>
    <slot />
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
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        padding: calc(var(--wordplay-spacing) / 2);
        cursor: pointer;
        width: fit-content;
        white-space: nowrap;
        transition: transform calc(var(--animation-factor) * 200ms);
        line-height: 1em;
    }

    button.on {
        background-color: var(--wordplay-alternating-color);
        box-shadow: inset 0px 1px var(--wordplay-chrome);
        transform: scale(0.9);
    }

    button:hover {
        transform: scale(1.1);
        background-color: var(--wordplay-alternating-color);
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
