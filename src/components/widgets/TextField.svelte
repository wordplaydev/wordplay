<script lang="ts">
    import { getLocalizing } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { CONFIRM_SYMBOL } from '@parser/Symbols';
    import { onMount, tick } from 'svelte';
    import { withMonoEmoji } from '@unicode/emoji';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import caretBoundaryKey, {
        caretBoundarySelection,
    } from '@components/widgets/caretKeys';
    import placeValidationMessage, {
        hideMessage,
        showMessage,
        supportsTopLayer,
    } from '@components/widgets/validationMessage';

    interface Props {
        /** The current text to show */
        text?: string;
        placeholder: LocaleTextAccessor | string;
        description: LocaleTextAccessor;
        /** A validation function that either returns true if valid or a message accessor if false */
        validator?: undefined | ((text: string) => LocaleTextAccessor | true);
        changed?: undefined | ((text: string) => void);
        focus?: () => void;
        blur?: () => void;
        // Called if someone typed and paused for more than a second.
        dwelled?: undefined | ((text: string) => void);
        done?:
            | undefined
            | ((text: string) => Promise<void>)
            | ((text: string) => void);
        fill?: boolean;
        view?: HTMLInputElement | undefined;
        border?: boolean;
        right?: boolean;
        defaultFocus?: boolean;
        editable?: boolean;
        classes?: string[] | undefined;
        /** An optional ID applied to the data-id attribute*/
        data?: number | undefined;
        kind?: 'email' | 'password' | undefined;
        /** CSS length or nothing, setting the max-width of the field*/
        max?: string | undefined;
        /** Hard cap on input length, in UTF-16 code units. Wired through to
         *  the underlying `<input maxlength>` so the browser blocks further
         *  keystrokes and truncates pastes. Close to "graphemes" for ASCII
         *  and most CJK; for emoji-heavy text the cap is more restrictive
         *  than a pure grapheme count (zero-width-joiner emoji can take
         *  4+ code units each), which is what we want — visual width per
         *  emoji is also higher, so layout constraints are tighter. */
        maxlength?: number | undefined;
        /** A unique ID for testing and ARIA purposes */
        id: string;
        /** Whether to put validation messages inline instead of floating */
        inlineValidation?: boolean;
        /** Suppress the auto-injected description tip-edit badge that normally appears
         *  in localizing mode. Set to true when embedding this TextField inside another
         *  localization editor (e.g., LocalizedText's own inline editor uses TextField
         *  internally, and the nested badge would be redundant). */
        noTipBadge?: boolean;
    }

    let {
        text = $bindable(''),
        placeholder,
        description,
        validator = undefined,
        changed = undefined,
        focus = undefined,
        blur = undefined,
        dwelled = undefined,
        done = undefined,
        fill = false,
        view = $bindable(undefined),
        border = true,
        right = false,
        defaultFocus = false,
        editable = true,
        classes = undefined,
        id,
        kind = undefined,
        max = undefined,
        maxlength = undefined,
        inlineValidation = false,
        noTipBadge = false,
    }: Props = $props();

    let width = $state(0);
    let focused = $state(false);
    /** Whether this field has been edited; see `showMessageNow`. */
    let touched = $state(false);
    /** The aria-label: primary locale only, since screen readers speak it in
     *  one voice. */
    let title = $derived($locales.getPrimaryPlainText(description));
    /** The visible placeholder keeps the multilingual echo; the
     *  aria-placeholder below is primary-only. */
    let placeholderText = $derived(
        typeof placeholder === 'string'
            ? placeholder
            : $locales.getPlainText(placeholder),
    );
    let primaryPlaceholder = $derived(
        typeof placeholder === 'string'
            ? placeholder
            : $locales.getPrimaryPlainText(placeholder),
    );
    let savingDone = $state<false | undefined | true>(false);
    let localizing = getLocalizing();

    let timeout: NodeJS.Timeout | undefined = undefined;

    /** The message to display if invalid */
    let message = $derived(validator ? validator(text) : undefined);

    /** Whether the message is the reader's business now. It outlives focus —
     *  clicking away used to take the explanation with it, leaving bad text and
     *  an inactive submit saying nothing — but cannot simply follow validity,
     *  since most validators here call an empty field invalid and a form would
     *  greet you with its errors. Emptying a field is not a complaint. */
    let showMessageNow = $derived(
        typeof message === 'function' && (focused || (touched && text !== '')),
    );

    let messageView = $state<HTMLElement | undefined>(undefined);
    let messageAt = $state<{ left: number; top: number } | undefined>(
        undefined,
    );

    /** Float the message clear of everything rather than hanging it off the
     *  field: an absolutely positioned message is clipped by any ancestor that
     *  scrolls or caps its height, and a field is often inside one. The rules
     *  live in `placeValidationMessage`, shared with TextBox. */
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
            inlineValidation,
            getComputedStyle(view).direction === 'rtl',
        );
    }

    $effect(() => {
        // Deliberately keyed on what makes it appear, and never reads
        // `messageAt`, so writing the position doesn't re-run this.
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
        // Capture, so a scroll of any ancestor moves it with the field.
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            resize.disconnect();
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    });

    function handleInput() {
        touched = true;
        if (changed) changed(text);

        if (timeout) clearTimeout(timeout);
        if (dwelled)
            timeout = setTimeout(() => {
                if (dwelled) dwelled(text);
            }, 1000);

        // Restore input
        tick().then(() => {
            if (view) {
                setKeyboardFocus(view, 'Restoring focus after text edit.');
            }
        });
    }

    function setKind(kind: 'email' | 'password' | undefined) {
        if (view === undefined) return;
        if (kind === 'email' && view) view.type = 'email';
        else if (kind === 'password' && view) view.type = 'password';
        else view.type = 'text';
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Home/End have to be handled here: on macOS the browser runs them as a
        // scroll of the nearest scrollable ancestor instead of moving the caret
        // (see caretKeys). Claim them so our fields behave the same everywhere.
        const boundary = caretBoundaryKey(event);
        if (boundary !== undefined && view) {
            const { start, end } = caretBoundarySelection(
                boundary,
                event.shiftKey,
                view.selectionStart ?? 0,
                view.selectionEnd ?? 0,
                text,
            );
            view.setSelectionRange(start, end);
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const number = parseFloat(text);

        // Not moving past a boundary? Don't let anything handle the event. Otherwise bubble it.
        const movingPastStart =
            event.key === 'ArrowLeft' &&
            view &&
            view.selectionStart !== null &&
            view.selectionStart === 0;
        const movingPastEnd =
            event.key === 'ArrowRight' &&
            view &&
            view.selectionStart !== null &&
            view.selectionStart === text.length;

        // Stop propation on arrows unless moving past a boundary.
        if (
            event.key.length === 1 ||
            event.key === 'Backspace' ||
            (event.key.startsWith('Arrow') &&
                !movingPastStart &&
                !movingPastEnd)
        )
            event.stopPropagation();

        // Not a number or not an up/down arrow key? Return.
        if (isNaN(number)) return;

        // Handle increment/decrement.
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

        event.stopPropagation();
        text = (number + (event.key === 'ArrowUp' ? 1 : -1)).toString();
        handleInput();
    }

    onMount(() => {
        setKind(kind);
    });

    /** Dynamically set the field's type, since it can't be adjusted with Svelte. */
    $effect(() => {
        setKind(kind);
    });
</script>

<div class="field-group" class:fill>
    <div
        class="field"
        class:fill
        class:showing={showMessageNow}
        class:inline={inlineValidation}
    >
        <input
            type="text"
            class={classes?.join(' ')}
            class:border
            class:right
            {id}
            data-id={id}
            data-testid={id}
            data-defaultfocus={defaultFocus ? '' : null}
            class:error={typeof message === 'function'}
            aria-label={title}
            aria-placeholder={primaryPlaceholder}
            placeholder={withMonoEmoji(placeholderText)}
            aria-invalid={typeof message === 'function'}
            aria-describedby={typeof message === 'function'
                ? `${id}-error`
                : null}
            style:width={fill ? null : `${width + 5}px`}
            style:max-width={max}
            {maxlength}
            disabled={!editable}
            bind:value={text}
            bind:this={view}
            oninput={handleInput}
            onkeydown={handleKeyDown}
            onpointerdown={(event) => event.stopPropagation()}
            onblur={async () => {
                focused = false;
                blur?.();
                if (done) {
                    savingDone = undefined;
                    await done(text);
                    savingDone = true;
                    setTimeout(() => {
                        savingDone = false;
                    }, 1500);
                }
            }}
            onfocus={() => {
                focused = true;
                focus?.();
            }}
        />
        <span class="measurer" bind:clientWidth={width}
            >{text.length === 0
                ? placeholderText
                : kind === 'password'
                  ? '•'.repeat(text.length)
                  : text.replaceAll(' ', '\xa0')}</span
        >
        {#if typeof message === 'function'}
            <div
                popover="manual"
                class="message"
                class:inline={inlineValidation}
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
    /* Wraps the input field and its localizing tip badge, anchoring the badge to the
       field's corner. Becomes a wrappable flex row so the inline tip editor, when
       expanded, can break to a new line (growing the wrapper's height) instead of
       overlapping the next form field. */
    .field-group {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing-half);
        position: relative;
    }

    .field-group.fill {
        width: 100%;
    }

    .field {
        display: inline-block;
        position: relative;
    }

    .field.inline {
        z-index: 2;
    }

    /* A disabled field must look different from an idle one: the resting
       border and placeholder already use the inactive color, so color alone
       says nothing. Dim the whole field and dot its border — the same "not
       now" vocabulary as inactive buttons — so e.g. the stage's chat field
       visibly sleeps outside play mode. (Disabled controls are exempt from
       contrast minimums; the dimming is the message.) */
    [disabled] {
        color: var(--wordplay-inactive-color);
        opacity: 0.4;
        cursor: default;
    }

    input.border[disabled] {
        border-bottom-style: dotted;
    }

    input {
        width: auto;
        height: 100%;
        background: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        color: inherit;
        border: none;
        outline: none;
        /* Drop native rendering so the field's size doesn't shift with the UA's
           color-scheme metrics once color-scheme is set on :root. */
        appearance: none;
        min-width: 3em;
        cursor: text;
    }

    input::placeholder {
        font-family: var(--wordplay-app-font);
        font-style: italic;
        color: var(--wordplay-inactive-color);
    }

    .measurer {
        display: inline-block;
        position: absolute;
        inset-inline-start: 0;
        top: 0;
        background: none;
        font-size: inherit;
        font-family: inherit;
        color: inherit;
        border: none;
        outline: none;
        visibility: hidden;
    }

    input.border {
        border-bottom: var(--wordplay-inactive-color) solid
            var(--wordplay-focus-width);
    }

    input.right {
        text-align: end;
    }

    .fill {
        width: 100%;
    }

    .fill input {
        width: 100%;
    }

    input.error {
        color: var(--wordplay-error);
        border-color: var(--wordplay-error);
    }

    input::placeholder {
        color: var(--wordplay-inactive-color);
        font-style: italic;
        opacity: 1;
    }

    /* Needs to be last to override errors */
    input:focus {
        border-bottom: var(--wordplay-focus-color) solid
            var(--wordplay-focus-width);
    }

    .message {
        display: none;
    }

    .field.showing .message {
        display: block;
        position: absolute;
        top: 100%;
        /* Overridden once measured; see placeMessage. */
        width: 15em;
        background: var(--wordplay-error);
        color: var(--wordplay-error-text-color);
        padding: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-small-font-size));
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        z-index: 2;
    }

    .field.showing .message.inline {
        top: 0;
        inset-inline-start: 100%;
        white-space: nowrap;
        width: auto;
        border-start-start-radius: 0;
        border-end-start-radius: 0;
        border-start-end-radius: var(--wordplay-border-radius);
        border-end-end-radius: var(--wordplay-border-radius);
    }

    /* Out of every ancestor's overflow, so a scrolling or height-capped
       container can't clip it — and dressed like the app's other floating
       panels rather than like something hanging off the field, since the two
       bottom-rounded corners only made sense while it shared the field's
       edge. */
    .field.showing .message.placed {
        position: fixed;
        /* Outlives focus, so it must never swallow a press meant for what it
           sits over; nothing in it is interactive. */
        pointer-events: none;
        z-index: 100;
        /* Beats `.inline` above, whose positioning this replaces: it sets
           `inset-inline-start: 100%`, which in a right-to-left field is
           `right: 100%` — and with a `right` and a JS `left` both applied the
           box collapsed to nothing and slid off the screen. */
        inset: auto;
        white-space: normal;
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

    /* The UA hides a closed popover, but `.field.showing .message` above would
       show it anyway; this is the same weight and comes later. */
    .message.placed:not(:popover-open) {
        display: none;
    }

    .done {
        position: absolute;
        inset-inline-end: -1em;
        /* Center vertically in the field and match the field's text size, so
           the save feedback stays visible even on large fields (e.g. an
           editable page header). */
        top: 50%;
        transform: translateY(-50%);
        font-size: inherit;
        color: var(--wordplay-inactive-color);
    }
</style>
