<script module lang="ts">
    export type ActionReturn = void | boolean | undefined;
    export type Action = () => Promise<ActionReturn> | ActionReturn;
</script>

<script lang="ts">
    import { getTip } from '@components/project/Contexts';
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
        size?: undefined | 'inherit';
        /** Whether it should have a background */
        background?: boolean | 'salient';
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
        size = undefined,
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
    let tooltip = $derived(
        isComputedTooltip(tip)
            ? tip()
            : $locales.concretize($locales.getPlainText(tip)).toText(),
    );
    let pressed = $state(false);

    let hint = getTip();
    function showTip() {
        if (_) hint.show(tooltip, _);
    }
    function hideTip() {
        hint.hide();
    }

    async function doAction(event: Event) {
        if (active) {
            const result = action();
            setTimeout(() => (pressed = false), 100);

            if (result instanceof Promise) {
                loading = true;
                result.finally(() => (loading = false));
            }
            event.stopPropagation();
            event.preventDefault();
        }
    }
</script>

<!-- 
    Note: we don't make the button inactive using "disabled" because that makes it invisible to screen readers. 
    Note: we prevent focus on click in order to preserve keyboard focus prior to the click.
-->
<button
    class:stretch
    class:background={background === true}
    class:salient={background === 'salient'}
    class:inherit={size === 'inherit'}
    class:padding
    class:scale
    class:large
    class:pressed
    class:wrap
    data-testid={testid}
    data-uiid={uiid}
    class={classes}
    type={submit ? 'submit' : 'button'}
    aria-label={tooltip}
    aria-disabled={!active}
    aria-keyshortcuts={shortcut}
    onpointerdown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (active) pressed = true;
    }}
    onpointerenter={showTip}
    onpointerleave={() => {
        hideTip();
        pressed = false;
    }}
    ontouchstart={showTip}
    ontouchend={hideTip}
    ontouchcancel={hideTip}
    onfocus={showTip}
    onblur={hideTip}
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
        font-size: var(--wordplay-small-font-size);
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
        transition:
            transform calc(var(--animation-factor) * 50ms),
            box-shadow calc(var(--animation-factor) * 50ms),
            background-color calc(var(--animation-factor) * 50ms);
        /* This allows command hints to be visible */
        position: relative;
        overflow: visible;
        /* Don't let it shrink smaller than its width */
        flex-shrink: 0;
    }

    .inherit {
        font-size: inherit;
    }

    .wrap {
        white-space: normal;
    }

    .padding {
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
    }

    button.stretch {
        width: inherit;
        height: inherit;
    }

    /* Raised, bordered look with hard offset shadow for dimensionality */
    .background,
    .salient {
        color: var(--wordplay-foreground);
        background: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        text-shadow: 0 var(--wordplay-border-width) 0
            var(--color-shadow-transparent);
    }

    .salient {
        outline: var(--wordplay-highlight-color) solid
            var(--wordplay-border-width);
        outline-offset: calc(var(--wordplay-border-width) * -1);
        background: var(--wordplay-alternating-color);
        border-radius: 0;
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }

    /* Disabled background buttons: flat, muted, no shadow */
    .background[aria-disabled='true'] {
        background: var(--wordplay-alternating-color);
        border-color: var(--wordplay-border-color);
        box-shadow: none;
        text-shadow: none;
        opacity: 0.55;
    }

    button:focus {
        background: var(--wordplay-focus-color);
        fill: var(--wordplay-background);
    }

    /* Focus on background buttons: blue fill, stronger shadow, white text */
    button.background:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        border-color: var(--wordplay-border-color);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        text-shadow: 0 var(--wordplay-border-width) var(--wordplay-border-width)
            var(--color-shadow);
        fill: var(--wordplay-background);
        outline: none;
    }

    button:hover:not(.pressed)[aria-disabled='false'] {
        background: var(--wordplay-hover);
        transform: translate(-1px, -1px);
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
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
    }

    button:focus {
        transform: translate(-1px, -1px);
    }

    /* Hover on background buttons: lift with larger shadow */
    button.background:hover:not(.pressed)[aria-disabled='false'],
    button.background:focus {
        border-color: var(--wordplay-border-color);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
    }

    button.pressed {
        transform: translate(1px, 1px);
    }

    /* Pressed background buttons: shadow collapses, button sinks into it */
    button.background.pressed {
        box-shadow: none;
        transform: translate(
            var(--wordplay-border-width),
            var(--wordplay-border-width)
        );
        text-shadow: none;
    }
</style>
