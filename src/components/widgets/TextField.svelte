<script lang="ts">
    import { onMount } from 'svelte';

    export let text = '';
    export let placeholder: string;
    export let description: string;
    export let validator: undefined | ((text: string) => boolean) = undefined;
    export let changed: undefined | ((text: string) => void) = undefined;
    export let done: undefined | (() => void) = undefined;
    export let fill = false;
    export let view: HTMLInputElement | undefined = undefined;
    export let border = true;
    export let right = false;
    export let defaultFocus = false;
    export let editable = true;
    export let email = false;

    let width = 0;

    function handleInput(event: Event) {
        if (changed && (validator === undefined || validator(text) === true))
            changed(text);
    }

    onMount(() => {
        if (email && view) view.type = 'email';
    });
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
        {placeholder}
        style:width={fill ? null : `${width + 5}px`}
        disabled={!editable}
        bind:value={text}
        bind:this={view}
        on:input={handleInput}
        on:keydown|stopPropagation
        on:blur={done}
    />
    <span class="measurer" bind:clientWidth={width}
        >{text.length === 0 ? placeholder : text}</span
    >
</div>

<style>
    .field {
        display: inline-block;
        position: relative;
    }

    input {
        width: auto;
        height: 100%;
        background: none;
        font-size: inherit;
        font-family: inherit;
        color: inherit;
        border: none;
        outline: none;
        min-width: 4em;
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
