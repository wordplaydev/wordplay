<script lang="ts">
    import placeValidationMessage, {
        hideMessage,
        showMessage,
        supportsTopLayer,
    } from '@components/widgets/validationMessage';
    import { getLocalizing } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { CONFIRM_SYMBOL } from '@parser/Symbols';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import caretBoundaryKey, {
        caretBoundarySelection,
    } from '@components/widgets/caretKeys';

    interface Props {
        text: string;
        description: LocaleTextAccessor;
        placeholder: LocaleTextAccessor;
        active?: boolean;
        inline?: boolean;
        done?: ((text: string) => void) | ((text: string) => Promise<void>);
        dwelled?: undefined | ((text: string) => void);
        validator?: undefined | ((text: string) => LocaleTextAccessor | true);
        id: string;
        view?: HTMLTextAreaElement | undefined;
        /** Cap the visible height at this many lines, scrolling beyond it,
         *  so a growing value can't stretch its surrounding layout. */
        maxrows?: number | undefined;
        /** Hard cap on input length, in UTF-16 code units, wired to the
         *  underlying `<textarea maxlength>` so the browser blocks further
         *  keystrokes and truncates pastes. */
        maxlength?: number | undefined;
        onkeydown?: (event: KeyboardEvent) => void;
        /** Suppress the auto-injected description tip-edit badge in localizing mode.
         *  Set to true when embedded inside another localization editor. */
        noTipBadge?: boolean;
    }

    let {
        text = $bindable(),
        description,
        placeholder,
        done = undefined,
        validator = undefined,
        active = true,
        inline = false,
        dwelled = undefined,
        id,
        view = $bindable(undefined),
        maxrows = undefined,
        maxlength = undefined,
        onkeydown = undefined,
        noTipBadge = false,
    }: Props = $props();

    let focused = $state(false);
    /** Whether this box has been edited; see TextField's `showMessageNow`. */
    let touched = $state(false);

    let messageView = $state<HTMLElement | undefined>(undefined);
    let messageAt = $state<{ left: number; top: number } | undefined>(
        undefined,
    );

    /** Float the message clear of everything rather than hanging it off the
     *  box: an absolutely positioned message is clipped by any ancestor that
     *  scrolls or caps its height, and a box is often inside one. Same rules as
     *  TextField's, from the shared `placeValidationMessage`. */
    function placeMessage() {
        if (view === undefined || messageView === undefined) return;
        // Open first: a closed popover has no box to measure. The box's own
        // constraints — `max-width`, chiefly — are on `.placed`, which is
        // applied from the start rather than once a position exists: measuring
        // an unconstrained box gave a width the rendered one never had, and in
        // Hebrew that put the message off the left of the screen.
        showMessage(messageView);
        const field = view.getBoundingClientRect();
        const panel = messageView.getBoundingClientRect();
        messageAt = placeValidationMessage(
            field,
            { width: panel.width, height: panel.height },
            { width: window.innerWidth, height: window.innerHeight },
            false,
            getComputedStyle(view).direction === 'rtl',
        );
    }

    $effect(() => {
        // Keyed on what makes it appear, and never reads `messageAt`, so
        // writing the position doesn't re-run this.
        if (!showMessageNow) {
            messageAt = undefined;
            if (messageView) hideMessage(messageView);
            return;
        }
        // Without the top layer there is nowhere safe to float to, so it stays
        // where it always was: below the field, and clippable.
        if (!supportsTopLayer()) return;
        placeMessage();
        const reposition = () => placeMessage();
        // Its own size is not settled when it first appears — the text can
        // arrive with the locale, a font can load, a badge can be added — and
        // a position computed for a narrower box put the Hebrew message off
        // the left of the screen. Watch the box rather than assume it.
        const resize = new ResizeObserver(reposition);
        if (messageView) resize.observe(messageView);
        // Capture, so a scroll of any ancestor moves it with the box.
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            resize.disconnect();
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    });
    /** The visible title tooltip keeps the multilingual echo; the aria-label
     *  is primary-only since screen readers speak it in one voice. */
    let title = $derived($locales.getPlainText(description));
    let ariaLabel = $derived($locales.getPrimaryPlainText(description));
    let savingDone = $state<boolean | undefined>(false);
    let localizing = getLocalizing();

    /** The message to display if invalid */
    let message = $derived.by(() => {
        if (validator) {
            const message = validator(text);
            if (message === true) return undefined;
            else return message;
        } else return undefined;
    });

    /** See TextField's `showMessageNow`, whose rule this mirrors. */
    let showMessageNow = $derived(
        message !== undefined && (focused || (touched && text !== '')),
    );

    function handleInput() {
        touched = true;
        if (dwelled)
            setTimeout(() => {
                if (dwelled) dwelled(text);
            }, 1000);
    }

    function resize() {
        if (view) {
            view.style.height = 'auto';
            view.style.height = `${view.scrollHeight}px`;
        }
    }

    $effect(() => {
        if (text.length >= 0) resize();
    });
</script>

<div class="box-group">
    <div class="box" {id} class:showing={showMessageNow}>
        <textarea
            {title}
            aria-label={ariaLabel}
            aria-invalid={message !== undefined}
            aria-describedby={message !== undefined ? `${id}-error` : null}
            placeholder={$locales.getPlainText(placeholder)}
            class={{ inline, error: message !== undefined }}
            style:max-height={maxrows !== undefined
                ? `calc(${maxrows} * 1lh)`
                : null}
            style:overflow-y={maxrows !== undefined ? 'auto' : null}
            bind:value={text}
            bind:this={view}
            aria-disabled={!active}
            {maxlength}
            rows={text.split('\n').length}
            disabled={!active}
            onblur={async () => {
                if (done) {
                    savingDone = undefined;
                    await done(text);
                    savingDone = true;
                    setTimeout(() => {
                        savingDone = false;
                    }, 1500);
                }
                focused = false;
            }}
            onfocus={() => (focused = true)}
            oninput={handleInput}
            onkeydown={(e) => {
                e.stopPropagation();
                // Home/End have to be handled here: on macOS the browser runs
                // them as a scroll of the nearest scrollable ancestor instead of
                // moving the caret (see caretKeys).
                const boundary = caretBoundaryKey(e);
                if (boundary !== undefined && view) {
                    const { start, end } = caretBoundarySelection(
                        boundary,
                        e.shiftKey,
                        view.selectionStart ?? 0,
                        view.selectionEnd ?? 0,
                        text,
                    );
                    view.setSelectionRange(start, end);
                    e.preventDefault();
                    return;
                }
                if (onkeydown) onkeydown(e);
            }}></textarea>
        {#if message !== undefined}
            <!-- `{id}-error`, matching the textarea's aria-describedby. It
                 read `id-{id}`, so the reference dangled and a screen reader
                 was told about a description that did not exist. -->
            <div
                popover="manual"
                class="message"
                class:placed={supportsTopLayer()}
                bind:this={messageView}
                style:left={messageAt ? `${messageAt.left}px` : null}
                style:top={messageAt ? `${messageAt.top}px` : null}
                id="{id}-error"><LocalizedText path={message} /></div
            >
        {/if}
        {#if savingDone !== false}
            <div class="done"
                >{#if savingDone === undefined}…{:else if savingDone === true}{CONFIRM_SYMBOL}{/if}</div
            >{/if}
    </div>
    {#if localizing?.on && !noTipBadge}<LocalizedText
            path={description}
            tipIcon
        />{/if}
</div>

<style>
    /* Wraps the textarea and its localizing tip badge, anchoring the badge to the
       textarea's corner. Stays a column so the inline tip editor, when expanded, can
       break to a new line without overlapping content below. */
    .box-group {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
        position: relative;
    }

    .box {
        position: relative;
        width: 100%;
    }
    textarea {
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        border: none;
        border-inline-start: var(--wordplay-focus-width) solid
            var(--wordplay-inactive-color);
        padding-inline-start: var(--wordplay-spacing);
        width: 100%;
        resize: none;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        min-width: 3em;
        min-height: 2em;
    }

    .inline {
        width: auto;
    }

    textarea::placeholder {
        font-style: italic;
        color: var(--wordplay-inactive-color);
        font-family: var(--wordplay-app-font);
    }

    textarea[aria-disabled='true'] {
        background: var(--wordplay-inactive-color);
    }

    .error {
        color: var(--wordplay-error);
        border-color: var(--wordplay-error);
    }

    /* Needs to be last to override the error color */
    textarea:focus {
        outline: none;
        border-inline-start-color: var(--wordplay-focus-color);
    }

    .message {
        display: none;
    }

    .box.showing .message {
        display: block;
        position: absolute;
        top: 100%;
        /* Overridden once measured; see placeMessage. */
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-small-font-size));
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        z-index: 2;
    }

    /* Out of every ancestor's overflow, and dressed like the app's other
       floating panels: the two bottom-rounded corners only made sense while it
       shared the box's edge. */
    .box.showing .message.placed {
        position: fixed;
        /* Outlives focus, so it must never swallow a press meant for what it
           sits over; nothing in it is interactive. */
        pointer-events: none;
        z-index: 100;
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        box-shadow: 2px 2px 5px var(--wordplay-chrome);
        /* Undo the popover UA box, which centers itself in the viewport and
           draws its own border and padding. */
        margin: 0;
        inset: auto;
        overflow: visible;
        width: max-content;
        max-width: 15em;
    }

    /* The UA hides a closed popover, but `.box.showing .message` above would
       show it anyway; this is the same weight and comes later. */
    .message.placed:not(:popover-open) {
        display: none;
    }

    .done {
        position: absolute;
        inset-inline-end: 0;
        top: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-small-font-size));
        color: var(--wordplay-inactive-color);
    }
</style>
