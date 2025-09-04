<script module lang="ts">
    export type ActionReturn = void | boolean | undefined;
    export type Action = () => Promise<ActionReturn> | ActionReturn;
</script>

<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { withMonoEmoji } from '../../unicode/emoji';
    import Spinning from '../app/Spinning.svelte';
    import LocalizedText from './LocalizedText.svelte';

    interface Props {
        /** Tooltip and ARIA label for the button. LocaleTextAccessor to support multilingual tooltips, or a zero-argument function if computed. */
        tip: LocaleTextAccessor | (() => string);
        /** Optional label; if children provided, they override */
        label?: LocaleTextAccessor | undefined;
        /** What to do when pressed */
        action: Action;
        /** Whether the button should be clickable */
        active?: boolean;
        stretch?: boolean;
        /** If it should be marked a submit button*/
        submit?: boolean;
        /** Classes to add to the button */
        classes?: string | undefined;
        scale?: boolean;
        /** The DOM element corresponding to the button */
        view?: HTMLButtonElement | undefined;
        large?: boolean;
        /** Whether it should have a background */
        background?: boolean;
        /** Whether it should have padding */
        padding?: boolean;
        /** An ID to add for reference in the tutorial */
        uiid?: string | undefined;
        /** A test ID to add */
        testid?: string | undefined;
        /** An optional icon to place before the children, in monochrome */
        icon?: string | undefined;
        /** An optional shortcut string for ARIA */
        shortcut?: string;
        /** Whether to wrap the text in the button */
        wrap?: boolean;
        /** The label */
        children?: import('svelte').Snippet;
    }

    let {
        tip,
        label,
        action,
        active = true,
        stretch = false,
        submit = false,
        uiid = undefined,
        classes = undefined,
        scale = true,
        view: _ = $bindable(undefined),
        large = false,
        background = false,
        padding = true,
        testid = undefined,
        shortcut = undefined,
        wrap = false,
        icon,
        children,
    }: Props = $props();

    // Custom type guard to determine if the tip is a computed tooltip.
    function isComputedTooltip(fun: Function): fun is () => string {
        return fun.length === 0;
    }

    let loading = $state(false);
    let width = $state(0);
    let tooltip = isComputedTooltip(tip)
        ? tip()
        : $locales.concretize($locales.get(tip)).toText();
    let pressed = $state(false);

    async function doAction(event: Event) {
        if (active) {
            const result = action();
            pressed = true;
            setTimeout(() => (pressed = false), 100);

            if (result instanceof Promise) {
                loading = true;
                result.finally(() => (loading = false));
            }
            event.stopPropagation();
        }
    }
</script>

<!-- 
    Note: we don't make the button inactive using "disabled" because that makes it invisible to screen readers. 
    Note: we prevent focus on click in order to preserve keyboard focus prior to the click.
-->
<button
    class:stretch
    class:background
    class:padding
    class:scale
    class:large
    class:pressed
    class:wrap
    data-testid={testid}
    data-uiid={uiid}
    class={classes}
    bind:clientWidth={width}
    style:--characters={width / 20}
    type={submit ? 'submit' : 'button'}
    title={tooltip}
    aria-label={tooltip}
    aria-disabled={!active}
    aria-keyshortcuts={shortcut}
    onpointerdown={(event) => {
        event.preventDefault();
        event.stopPropagation();
    }}
    bind:this={_}
    ondblclick={(event) => event.stopPropagation()}
    onclick={loading
        ? null
        : (event) => {
              event.stopPropagation();
              event.button === 0 && active ? doAction(event) : undefined;
          }}
    onkeydown={loading
        ? null
        : (event) =>
              (event.key === 'Enter' || event.key === ' ') &&
              // Only activate with no modifiers down. Enter is used for other shortcuts.
              !event.shiftKey &&
              !event.ctrlKey &&
              !event.altKey &&
              !event.metaKey
                  ? doAction(event)
                  : undefined}
    >{#if loading}<Spinning />{:else}{#if icon}{withMonoEmoji(icon)}{/if}
        {#if children}{@render children()}{:else if label}<LocalizedText
                path={label}
            />{/if}{/if}
</button>

<style>
    button {
        background-color: var(--wordplay-chrome);
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        font-weight: var(--wordplay-font-weight);
        font-style: inherit;
        transform-origin: center;
        user-select: none;
        padding: 0;
        border: none;
        background: none;
        border-radius: var(--wordplay-border-radius);
        color: currentColor;
        cursor: pointer;
        min-width: 1em;
        min-height: var(--wordplay-widget-height);
        width: fit-content;
        white-space: nowrap;
        transition: transform calc(var(--animation-factor) * 100ms);
        /* This allows command hints to be visible */
        position: relative;
        overflow: visible;
        /* Don't let it shrink smaller than its width */
        flex-shrink: 0;
    }

    .wrap {
        white-space: normal;
    }

    .padding {
        padding-left: calc(var(--wordplay-spacing) / 2);
        padding-right: calc(var(--wordplay-spacing) / 2);
    }

    button.stretch {
        width: inherit;
        height: inherit;
    }

    .background {
        color: var(--wordplay-foreground);
        background: var(--wordplay-alternating-color);
    }
    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }

    .background[aria-disabled='true'] {
        background: var(--wordplay-alternating-color);
    }

    button:focus {
        background: var(--wordplay-focus-color);
        fill: var(--wordplay-background);
    }

    button:hover:not(:global(:focus))[aria-disabled='false'] {
        background: var(--wordplay-alternating-color);
    }

    .button.active {
        transform: translateY(0.25em) scale(0.9);
    }

    :global(button:focus .token-view) {
        color: var(--wordplay-background);
    }

    .large {
        font-size: 24pt;
    }

    .background.padding {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .background[aria-disabled='true'] {
        border-color: transparent;
    }

    button:hover:not(.pressed)[aria-disabled='false'],
    button:focus {
        transform: rotate(calc(-15deg / var(--characters)));
    }

    button.background:hover[aria-disabled='false'] {
        background: var(--wordplay-chrome);
        border-color: var(--wordplay-alternating-color);
    }

    button.pressed {
        transform: translateY(-0.25em) scale(1.1);
    }
</style>
