<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { onMount, tick } from 'svelte';
    import { withMonoEmoji } from '../../unicode/emoji';

    interface Props {
        /** The current text to show */
        text?: string;
        placeholder: LocaleTextAccessor | string;
        description: LocaleTextAccessor;
        /** A validation function that either returns true if valid or a message accessor if false */
        validator?: undefined | ((text: string) => LocaleTextAccessor | true);
        changed?: undefined | ((text: string) => void);
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
        /** A unique ID for testing and ARIA purposes */
        id: string;
        /** Whether to put validation messages inline instead of floating */
        inlineValidation?: boolean;
    }

    let {
        text = $bindable(''),
        placeholder,
        description,
        validator = undefined,
        changed = undefined,
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
        inlineValidation = false,
    }: Props = $props();

    let width = $state(0);
    let focused = $state(false);
    let title = $derived($locales.get(description));
    let placeholderText = $derived(
        typeof placeholder === 'string'
            ? placeholder
            : $locales.get(placeholder),
    );
    let savingDone = $state<false | undefined | true>(false);

    let timeout: NodeJS.Timeout | undefined = undefined;

    /** The message to display if invalid */
    let message = $derived.by(() => {
        if (validator) {
            const message = validator(text);
            if (message === true) return undefined;
            else return $locales.get(message);
        } else return undefined;
    });

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

<div class="field" class:fill class:focused class:inline={inlineValidation}>
    <input
        type="text"
        class={classes?.join(' ')}
        class:border
        class:right
        {id}
        data-id={id}
        data-defaultfocus={defaultFocus ? '' : null}
        class:error={message !== undefined}
        aria-label={title}
        aria-placeholder={placeholderText}
        placeholder={withMonoEmoji(placeholderText)}
        aria-invalid={message !== undefined}
        aria-describedby="{id}-error"
        style:width={fill ? null : `${width + 5}px`}
        style:max-width={max}
        disabled={!editable}
        bind:value={text}
        bind:this={view}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        onpointerdown={(event) => event.stopPropagation()}
        onblur={async () => {
            focused = false;
            if (done) {
                savingDone = undefined;
                await done(text);
                savingDone = true;
                setTimeout(() => {
                    savingDone = false;
                }, 1500);
            }
        }}
        onfocus={() => (focused = true)}
    />
    <span class="measurer" bind:clientWidth={width}
        >{text.length === 0
            ? placeholderText
            : kind === 'password'
              ? '•'.repeat(text.length)
              : text.replaceAll(' ', '\xa0')}</span
    >
    {#if message}
        <div class="message" class:inline={inlineValidation} id="{id}-error"
            >{message}</div
        >
    {/if}
    {#if savingDone !== false}
        <div class="done"
            >{#if savingDone === undefined}…{:else if savingDone === true}✓{/if}</div
        >{/if}
</div>

<style>
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
        min-width: 1em;
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
        left: 0;
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
        text-align: right;
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
        color: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-small-font-size));
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        z-index: 2;
    }

    .focused .message.inline {
        top: 0;
        left: 100%;
        white-space: nowrap;
        width: auto;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
    }

    .done {
        position: absolute;
        right: -1em;
        top: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-small-font-size));
        color: var(--wordplay-inactive-color);
    }
</style>
