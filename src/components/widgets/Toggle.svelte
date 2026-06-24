<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import { MULTILINGUAL_SEPARATOR } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    import type { ToggleText } from '@locale/UITexts';
    import {
        toShortcut,
        type Command,
    } from '@components/editor/commands/Commands';

    interface Props {
        tips: (locale: LocaleText) => ToggleText;
        on: boolean;
        toggle: () => void;
        active?: boolean;
        uiid?: string | undefined;
        testid?: string | undefined;
        command?: Command | undefined;
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
        highlight = false,
        children,
    }: Props = $props();

    async function doToggle(event: Event) {
        if (active) {
            toggle();
            event?.stopPropagation();
        }
    }

    // One tooltip line per chosen locale (on/off label plus the shared shortcut suffix).
    let suffix = $derived(command ? ' (' + toShortcut(command) + ')' : '');
    let tipEntries = $derived(
        $locales.getMultilingualFrom(
            tips,
            (text) => `${on ? text.on : text.off}${suffix}`,
        ),
    );
    let title = $derived(
        tipEntries.map((entry) => entry.text).join(MULTILINGUAL_SEPARATOR),
    );

    let view = $state<HTMLButtonElement | undefined>(undefined);

    let hint = getTip();
    let localizing = getLocalizing();
    let offEditing = $state(false);
    let onEditing = $state(false);
    function showTip() {
        if (view && tipEntries.length > 0) hint.showMultilingual(tipEntries, view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<!--
    Note: we don't make the button inactive using "disabled" because that makes it invisible to screen readers.
    Note: we prevent mouse down default to avoid stealing keyboard focus.
-->
<span class="toggle-group">
    <button
        type="button"
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
    </button>{#if localizing?.on}<span class="tip-stack"
            >{#if !onEditing}<LocalizedText
                    path={tips}
                    extras={['off']}
                    tipIcon
                    onEditingChange={(e) => (offEditing = e)}
                />{/if}{#if !offEditing}<LocalizedText
                    path={tips}
                    extras={['on']}
                    tipIcon
                    onEditingChange={(e) => (onEditing = e)}
                />{/if}</span
        >{/if}
</span>

<style>
    /* Keep the button and its localizing tip badges as a single inline-flex unit
       so the parent layout treats them as one item (not separate flex children
       that can wrap to a new line). */
    .toggle-group {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        width: fit-content;
    }

    /* Stack the off-tip and on-tip badges vertically next to the toggle. */
    .tip-stack {
        display: inline-flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    button {
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        font-weight: var(--wordplay-font-weight);
        font-style: inherit;
        transform-origin: center;
        user-select: none;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        border-top-left-radius: 0;
        border-bottom-right-radius: 0;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        stroke: currentColor;
        fill: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        cursor: pointer;
        width: fit-content;
        min-height: var(--wordplay-widget-height);
        overflow: visible;
        white-space: nowrap;
        transition:
            transform calc(var(--animation-factor) * 100ms),
            box-shadow calc(var(--animation-factor) * 100ms);
        flex-shrink: 0;
        position: relative;
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        text-shadow: 0 var(--wordplay-border-width) 0
            var(--color-shadow-transparent);
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
        stroke: var(--wordplay-background);
        fill: var(--wordplay-background);
        background: var(--wordplay-alternating-color);
        box-shadow: inset var(--wordplay-border-width)
            var(--wordplay-border-width) 0 var(--wordplay-foreground);
        transform: translate(-1px, -1px);
    }

    .icon {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-spacing-half);
    }

    button:not(.on):hover {
        background: var(--wordplay-hover);
    }

    button:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        fill: var(--wordplay-background);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transform: translate(-1px, -1px);
        outline: none;
    }

    [aria-disabled='true'] {
        cursor: default;
        color: var(--wordplay-inactive-color);
        border-color: var(--wordplay-border-color);
        box-shadow: none;
        opacity: 0.55;
    }
</style>
