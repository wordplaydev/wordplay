<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import { type Snippet } from 'svelte';
    import type { ToggleText } from '../../locale/UITexts';
    import { toShortcut, type Command } from '../editor/util/Commands';

    interface Props {
        tips: (locale: LocaleText) => ToggleText;
        on: boolean;
        toggle: () => void;
        active?: boolean;
        uiid?: string | undefined;
        testid?: string | undefined;
        command?: Command | undefined;
        background?: boolean;
        highlight?: boolean;
        children: Snippet;
    }

    let {
        tips,
        on,
        toggle,
        active = true,
        uiid = undefined,
        testid = undefined,
        command = undefined,
        background = false,
        highlight = false,
        children,
    }: Props = $props();

    async function doToggle(event: Event) {
        if (active) {
            toggle();
            event?.stopPropagation();
        }
    }

    let text = $derived($locales.get(tips));

    let title = $derived(
        `${on ? text.on : text.off}${
            command ? ' (' + toShortcut(command) + ')' : ''
        }`,
    );

    let view = $state<HTMLButtonElement | undefined>(undefined);

    let hint = getTip();
    function showTip() {
        if (view) hint.show(title, view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<!-- 
    Note: we don't make the button inactive using "disabled" because that makes it invisible to screen readers. 
    Note: we prevent mouse down default to avoid stealing keyboard focus. 
-->
<button
    type="button"
    class:background
    class:highlight
    data-uiid={uiid}
    data-testid={testid}
    class:on
    aria-label={title}
    aria-disabled={!active}
    aria-pressed={on}
    ondblclick={(event) => event.stopPropagation()}
    onmousedown={(event) => event.preventDefault()}
    bind:this={view}
    onpointerenter={showTip}
    onpointerleave={hideTip}
    onfocus={showTip}
    onblur={hideTip}
    ontouchstart={showTip}
    ontouchend={hideTip}
    ontouchcancel={hideTip}
    onclick={(event) =>
        event.button === 0 && active ? doToggle(event) : undefined}
>
    <div class="icon">
        {@render children()}
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

    .highlight {
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);

        animation: bounce;
        animation-duration: calc(var(--animation-factor) * 1000ms);
        animation-delay: 0;
        animation-iteration-count: infinite;
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

    button:not(:global(.on)):hover .icon {
        transform: scale(1.1);
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
