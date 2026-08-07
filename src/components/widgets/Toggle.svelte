<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import type { TemplateInputs } from '@locale/Locales';
    import { untrack, type Snippet } from 'svelte';
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
        /** Template inputs for tips written as templates (e.g. naming what is toggled).
         *  Given these, each locale's line is concretized in that locale and rendered as
         *  markup, so `\…\` reads as code in the hint and as plain text in the label. */
        tipInputs?: TemplateInputs | undefined;
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
        tipInputs = undefined,
        children,
    }: Props = $props();

    async function doToggle(event: Event) {
        if (active) {
            toggle();
            event?.stopPropagation();
        }
    }

    // One tooltip line per chosen locale (on/off label plus the shared shortcut suffix).
    let suffix = $derived(
        command && tipInputs === undefined
            ? ' (' + toShortcut(command) + ')'
            : '',
    );
    let plainEntries = $derived(
        tipInputs === undefined
            ? $locales.getMultilingualFrom(
                  tips,
                  (text) => `${on ? text.on : text.off}${suffix}`,
              )
            : [],
    );
    let markupEntries = $derived(
        tipInputs === undefined
            ? []
            : $locales.getMultilingualMarkupFrom(
                  tips,
                  (text) => (on ? text.on : text.off),
                  tipInputs,
              ),
    );
    /** The aria-label — primary locale only (the first entry); the visible
     *  hint shows every chosen locale. Markup is flattened, so a `\name\` code
     *  span is read as the bare name rather than as its delimiters. */
    let title = $derived(
        tipInputs === undefined
            ? (plainEntries[0]?.text ?? '')
            : (markupEntries[0]?.markup.toText() ?? ''),
    );

    let view = $state<HTMLButtonElement | undefined>(undefined);

    let hint = getTip();
    let localizing = getLocalizing();
    let offEditing = $state(false);
    let onEditing = $state(false);
    function showTip() {
        if (view === undefined) return;
        if (tipInputs === undefined) {
            if (plainEntries.length > 0)
                hint.showMultilingual(plainEntries, view);
        } else if (markupEntries.length > 0)
            hint.showMarkup(
                markupEntries,
                view,
                command ? toShortcut(command) : undefined,
            );
    }
    // Pressing a toggle with the pointer resting on it flips `on` while its hint is
    // still showing, and the hint holds the entries it was given rather than reading
    // them live — so it would keep offering the action that was just performed
    // ("show source main" on a source that is now shown). Re-present it whenever this
    // toggle's label changes while this toggle is the one being described. The
    // untrack keeps showTip's own writes from re-triggering this effect.
    $effect(() => {
        void (tipInputs === undefined ? plainEntries : markupEntries);
        untrack(() => {
            if (view !== undefined && hint.getView() === view) showTip();
        });
    });

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
    </button>{#if localizing?.on}{#if !onEditing}<LocalizedText
                path={tips}
                extras={['off']}
                tipIcon
                tipCorner="start"
                onEditingChange={(e) => (offEditing = e)}
            />{/if}{#if !offEditing}<LocalizedText
                path={tips}
                extras={['on']}
                tipIcon
                onEditingChange={(e) => (onEditing = e)}
            />{/if}{/if}
</span>

<style>
    /* Anchors the off and on tip badges to the toggle's two block-start corners. */
    .toggle-group {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        width: fit-content;
        position: relative;
    }

    button {
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        font-weight: var(--wordplay-font-weight);
        font-style: inherit;
        /* Drop native rendering and pin the line box so a tall fallback-font
           icon glyph (e.g. the ☰ hamburger) can't inflate the button height —
           it stays square instead of stretching under color-scheme. */
        appearance: none;
        line-height: 1;
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
        /* Always black, not the mode-flipping background color: white text on
           the gold highlight is 3:1, under the 4.5:1 AA minimum; black passes
           in both modes. */
        color: var(--black-light);
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
        /* Keep nested links legible on the gold hover background (#1216). */
        --wordplay-link-color: var(--color-white);
        --wordplay-link-underline-color: var(--color-orange);
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
