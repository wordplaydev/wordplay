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
        button?:
            | {
                  tip: LocaleTextAccessor;
                  icon?: string;
                  /** Continuously spin the icon (e.g. to show ongoing work). */
                  spinIcon?: boolean;
                  label?: string | LocaleTextAccessor;
                  background?: boolean | 'salient' | 'circular';
                  testid?: string;
              }
            | undefined;
        children?: import('svelte').Snippet;
    }

    let {
        show = $bindable(false),
        id = undefined,
        header,
        explanation,
        closeable = true,
        wide = false,
        button = undefined,
        children,
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

    /** Show and focus dialog when shown, hide when not. */
    $effect(() => {
        if (view) {
            if (show) {
                view.showModal();
                tick().then(() =>
                    view
                        ? setKeyboardFocus(view, 'Focusing dialog')
                        : undefined,
                );
            } else {
                view.close();
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
        background={button.background ?? false}
        testid={button.testid}
        children={button.label !== undefined ? buttonLabel : undefined}
    />
{/if}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={view}
    class:wide
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
            {#if header}<Header text={header} />{/if}
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
        /* Fill the window width (minus margins) for maximum horizontal space. */
        width: 95vw;
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
        min-height: 100%;
        padding: 1em;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
