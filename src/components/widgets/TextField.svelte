<script lang="ts">
    import { onMount } from 'svelte';
    import { withVariationSelector } from '../../unicode/emoji';

    export let text = '';
    export let placeholder: string;
    export let description: string;
    export let validator: undefined | ((text: string) => boolean) = undefined;
    export let changed: undefined | ((text: string) => void) = undefined;
    export let done: undefined | ((text: string) => void) = undefined;
    export let fill = false;
    export let view: HTMLInputElement | undefined = undefined;
    export let border = true;
    export let right = false;
    export let defaultFocus = false;
    export let editable = true;
    export let kind: 'email' | 'password' | undefined = undefined;

    let width = 0;

    function handleInput() {
        if (changed && (validator === undefined || validator(text) === true))
            changed(text);
    }

    function setKind(kind: 'email' | 'password' | undefined) {
        if (view === undefined) return;
        if (kind === 'email' && view) view.type = 'email';
        else if (kind === 'password' && view) view.type = 'password';
        else view.type = 'text';
    }

    function handleKeyDown(event: KeyboardEvent) {
        const number = parseFloat(text);

        // Not a number or not an up/down arrow key? Return.
        if (isNaN(number)) return;
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

        text = (number + (event.key === 'ArrowUp' ? 1 : -1)).toString();
        handleInput();
    }

    onMount(() => {
        setKind(kind);
    });

    $: setKind(kind);
</script>

<div class="field">
    <input
        type="text"
        class:fill
        class:border
        class:right
        data-defaultfocus={defaultFocus ? '' : null}
        class:error={validator ? validator(text) === false : null}
        aria-label={description}
        aria-placeholder={placeholder}
        placeholder={withVariationSelector(placeholder)}
        style:width={fill ? null : `${width + 5}px`}
        disabled={!editable}
        bind:value={text}
        bind:this={view}
        on:input={handleInput}
        on:keydown|stopPropagation={handleKeyDown}
        on:blur={() => (done ? done(text) : undefined)}
    />
    <span class="measurer" bind:clientWidth={width}
        >{text.length === 0
            ? placeholder
            : kind === 'password'
              ? '•'.repeat(text.length)
              : text}</span
    >
</div>

<style>
    .field {
        display: inline-block;
        position: relative;
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
        min-width: 4em;
        cursor: text;
    }

    input::placeholder {
        font-family: var(--wordplay-app-font);
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

    input.fill {
        width: 100%;
    }

    input:focus {
        border-bottom: var(--wordplay-focus-color) solid
            var(--wordplay-focus-width);
    }

    input.error {
        color: var(--wordplay-error);
    }

    input::placeholder {
        color: var(--wordplay-inactive-color);
        font-style: italic;
        opacity: 1;
    }
</style>
