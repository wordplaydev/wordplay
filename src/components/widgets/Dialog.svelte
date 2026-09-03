<script lang="ts">
    import { clickOutside } from '@components/app/clickOutside';
    import Header from '@components/app/Header.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import Hint from '@components/widgets/Hint.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { tick } from 'svelte';
    import {
        isDialogOpenInURL,
        mountedDialogIds,
        setDialogInURL,
    } from './dialogURL';

    interface Props {
        show?: boolean;
        /** When set, the dialog's open state is persisted in the URL as
         *  `?dialog=<id>`, so a refresh or shared link reopens it. Must be a
         *  stable, app-unique string. */
        id?: string | undefined;
        header: LocaleTextAccessor | undefined;
        explanation: LocaleTextsAccessor | undefined;
        closeable?: boolean;
        /** Fill the window width (minus margins) rather than sizing to content.
         *  Use for dialogs whose content benefits from maximum horizontal space
         *  (e.g. wide example code in how-tos). */
        wide?: boolean;
        /** When set, fix the dialog to this CSS height instead of sizing to
         *  content, so its size doesn't jump as content changes (e.g. a list
         *  that grows and shrinks while filtering). The body scrolls if it
         *  overflows. */
        height?: string | undefined;
        /** Anchor the dialog below the top of the window instead of centering
         *  it. Use when the body swaps between panes of different heights — a
         *  centered dialog moves its top edge on every such change, so controls
         *  above the swapped pane shift under the pointer. */
        pinned?: boolean;
        button?:
            | {
                  tip: LocaleTextAccessor;
                  icon?: string | undefined;
                  /** Continuously spin the icon (e.g. to show ongoing work). */
                  spinIcon?: boolean;
                  /** Replace the button's content with the standard loading
                   *  indicator (see Button's loading prop). */
                  loading?: boolean;
                  label?: string | LocaleTextAccessor;
                  background?: boolean | 'salient' | 'circular';
                  testid?: string;
              }
            | undefined;
        children?: import('svelte').Snippet;
        /** Controls rendered on the header's line, after the title. For a single
         *  action that belongs to the dialog as a whole rather than to any one
         *  section of its body — a section of its own would overstate it. */
        headerControls?: import('svelte').Snippet;
    }

    let {
        show = $bindable(false),
        id = undefined,
        header,
        explanation,
        closeable = true,
        wide = false,
        height = undefined,
        pinned = false,
        button = undefined,
        children,
        headerControls,
    }: Props = $props();

    let view: HTMLDialogElement | undefined = $state(undefined);

    /** True when the element is mounted and not inside an `inert` subtree —
     *  OverflowToolbar renders an inert measurement clone of each item, and if
     *  that clone also reacted to the URL a single id would open two modals at
     *  once (the clone's would steal the top layer). */
    function isLive(el: HTMLDialogElement | undefined): boolean {
        return el !== undefined && el.closest('[inert]') === null;
    }

    /** Whether this instance should persist its open state in the URL. */
    let persists = $derived(id !== undefined && isLive(view));

    /** Register this dialog's id while it persists so the layout's cleanup knows
     *  it has an owner on this page. Keyed on id so a changing id is handled. */
    $effect(() => {
        if (!persists || id === undefined) return;
        mountedDialogIds.add(id);
        return () => mountedDialogIds.delete(id);
    });

    // Trackers for the two-way URL<->show sync below; start from "closed" so the
    // first run adopts whichever side already differs (e.g. a shared link that
    // arrives with the param set). Plain lets (not state) so updating them
    // doesn't itself trigger reactivity.
    let lastShow = false;
    let lastUrlOpen = false;

    /** Keep `show` and the URL in sync, pushing whichever side actually changed.
     *  URL changes (refresh, shared link, back/forward, another dialog opening)
     *  drive `show`; `show` changes (button, close, Escape, click-outside, or a
     *  parent's bind:show) drive the URL. Detecting the changed side avoids the
     *  two effects fighting and reverting each other. */
    $effect(() => {
        if (!persists || id === undefined) return;
        const urlOpen = isDialogOpenInURL(id);
        if (urlOpen !== lastUrlOpen) {
            lastUrlOpen = urlOpen;
            if (show !== urlOpen) lastShow = show = urlOpen;
        } else if (show !== lastShow) {
            lastShow = show;
            setDialogInURL(id, show);
        }
    });

    /** The element focused when the dialog opened, to restore focus on close.
     *  The native dialog tries this too, but loses track when surrounding
     *  state changes re-render the opener (e.g. an OverflowToolbar button),
     *  leaving keyboard users back at the top of the page. */
    let opener: HTMLElement | undefined = undefined;

    /** Show and focus dialog when shown, hide when not. */
    $effect(() => {
        if (view) {
            if (show) {
                opener =
                    document.activeElement instanceof HTMLElement
                        ? document.activeElement
                        : undefined;
                view.showModal();
                tick().then(() =>
                    view
                        ? setKeyboardFocus(view, 'Focusing dialog')
                        : undefined,
                );
            } else {
                view.close();
                if (opener !== undefined && opener.isConnected)
                    setKeyboardFocus(
                        opener,
                        'Restoring focus to dialog opener',
                    );
                opener = undefined;
            }
        }
    });
</script>

{#if button}
    {#snippet buttonLabel()}
        {#if typeof button?.label === 'string'}{button.label}{:else if button?.label}<LocalizedText
                path={button.label}
            />{/if}
    {/snippet}
    <Button
        tip={button.tip}
        action={() => (show = true)}
        icon={button.icon}
        spinIcon={button.spinIcon ?? false}
        loading={button.loading ?? false}
        background={button.background ?? false}
        testid={button.testid}
        children={button.label !== undefined ? buttonLabel : undefined}
    />
{/if}
<!-- The keydown catches Escape so the `show` state stays in sync with the
     native modal dialog, which otherwise closes itself without updating our
     state; the dialog element is the right event target, not a control
     needing a widget role. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={view}
    class:wide
    class:pinned
    class:fixed={height !== undefined}
    style={height ? `height: ${height};` : undefined}
    use:clickOutside={() => (show = false)}
    tabindex="-1"
    onkeydown={closeable
        ? (event) => (event.key === 'Escape' ? (show = false) : undefined)
        : undefined}
>
    <div class="container">
        {#if closeable}
            <div class="close">
                <Button
                    tip={(l) => l.ui.widget.dialog.close}
                    action={() => (show = false)}
                    background
                    icon="❌"
                ></Button>
            </div>
        {/if}

        <div class="content">
            {#if header || headerControls}
                <div class="heading">
                    {#if header}<Header text={header} />{/if}
                    {@render headerControls?.()}
                </div>
            {/if}
            {#if explanation}<MarkupHTMLView markup={explanation} />{/if}
            {@render children?.()}
        </div>
    </div>
    <Hint inDialog={true}></Hint>
</dialog>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: 0;
        margin-inline-start: auto;
        margin-inline-end: auto;
        max-width: 95vw;
        height: max-content;
        background-color: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        font-size: var(--wordplay-font-size);
    }

    dialog.wide {
        /* Fill the window along the text (minus margins) for maximum room. */
        inline-size: 95dvi;
    }

    /* An open modal must paint even when an ancestor is hidden — e.g. a dialog
       overflowed into a collapsed OverflowToolbar popup that re-opens itself
       from the URL on refresh. The ancestor uses `visibility: hidden` (not
       `display: none`) precisely so this override can take effect. */
    dialog[open] {
        visibility: visible;
        pointer-events: auto;
    }

    dialog.fixed {
        /* Height is set inline; scroll the body so the dialog stays put as
           content changes. The sticky close button rides the scroll. Unqualified
           `auto` rather than `overflow-y`, since which axis overflows is the
           writing mode's business. */
        overflow: auto;
    }

    /* Opt-in for dialogs whose body swaps between panes of different heights —
       tabs, in practice. Centering re-splits the leftover space on every height
       change, so the tab row slides out from under the pointer between clicks;
       anchoring the top edge holds it still. Capped at the space below the
       anchor so a taller pane scrolls inside the dialog rather than running off
       the window, which is what avoids having to measure the panes up front.
       Dynamic viewport units so mobile browser chrome doesn't push the dialog
       off-screen, and the block-axis ones so the anchor follows the text. */
    dialog.pinned {
        margin-block-start: 20dvb;
        margin-block-end: auto;
        max-block-size: calc(100dvb - 20dvb - 2em);
        overflow: auto;
    }

    dialog::backdrop {
        transition: backdrop-filter;
        backdrop-filter: blur(2px);
    }

    .container {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: 1em;
    }

    .close {
        position: sticky;
        top: 1em;
        width: 100%;
        text-align: end;
        z-index: 2;
    }

    .content {
        min-block-size: 100%;
        padding: 1em;
        /* The heading already provides the leading gap. */
        padding-block-start: 0;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    /* Baseline-aligned so a control sits on the title's line rather than
       centering against its much larger cap height, and wrapping so a long
       localized title doesn't squeeze the control off the edge. */
    .heading {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
    }
</style>
