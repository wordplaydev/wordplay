<script lang="ts">
    import { getLocalizing } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { CONFIRM_SYMBOL } from '@parser/Symbols';
    import { onMount, tick } from 'svelte';
    import { withMonoEmoji } from '@unicode/emoji';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';

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
    let title = $derived($locales.getPlainText(description));
    let placeholderText = $derived(
        typeof placeholder === 'string'
            ? placeholder
            : $locales.getPlainText(placeholder),
    );
    let savingDone = $state<false | undefined | true>(false);
    let localizing = getLocalizing();

    let timeout: NodeJS.Timeout | undefined = undefined;

    /** The message to display if invalid */
    let message = $derived(validator ? validator(text) : undefined);

    function handleInput() {
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
    <div class="field" class:fill class:focused class:inline={inlineValidation}>
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
            aria-placeholder={placeholderText}
            placeholder={withMonoEmoji(placeholderText)}
            aria-invalid={typeof message === 'function'}
            aria-describedby="{id}-error"
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
            <div class="message" class:inline={inlineValidation} id="{id}-error"
                ><LocalizedText path={message} /></div
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
    /* Wraps the input field and its localizing tip badge. Becomes a wrappable
       flex row so the inline tip editor, when expanded, can break to a new line
       (growing the wrapper's height) instead of overlapping the next form field. */
    .field-group {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing-half);
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

    [disabled] {
        color: var(--wordplay-inactive-color);
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

    .focused .message {
        display: block;
        position: absolute;
        top: 100%;
        width: 15em;
        background: var(--wordplay-error);
        color: var(--wordplay-error-text-color);
        padding: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-small-font-size));
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        z-index: 2;
    }

    .focused .message.inline {
        top: 0;
        inset-inline-start: 100%;
        white-space: nowrap;
        width: auto;
        border-start-start-radius: 0;
        border-end-start-radius: 0;
        border-start-end-radius: var(--wordplay-border-radius);
        border-end-end-radius: var(--wordplay-border-radius);
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
