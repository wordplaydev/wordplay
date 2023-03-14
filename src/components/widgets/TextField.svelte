<script lang="ts">
    export let text: string = '';
    export let placeholder: string;
    export let validator: undefined | ((text: string) => boolean) = undefined;
    export let changed: undefined | ((text: string) => void) = undefined;
    export let done: undefined | (() => void) = undefined;
    export let fill: boolean = false;
    export let input: HTMLInputElement | undefined = undefined;
    export let border: boolean = true;
    export let right: boolean = false;

    let width: number = 0;

    function handleInput() {
        if (changed && (validator === undefined || validator(text) === true))
            changed(text);
    }
</script>

<div class="field">
    <input
        type="text"
        class:fill
        class:border
        class:right
        class:error={validator ? validator(text) === false : null}
        {placeholder}
        style:width={fill ? null : `${width + 5}px`}
        bind:this={input}
        bind:value={text}
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
        min-width: 1em;
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
        border-bottom: var(--wordplay-disabled-color) solid
            var(--wordplay-border-width);
    }

    input.right {
        text-align: right;
    }

    input.fill {
        width: 100%;
    }

    input:focus {
        border-bottom-color: var(--wordplay-highlight);
    }

    input.error {
        color: var(--wordplay-error);
    }

    input::placeholder {
        color: var(--wordplay-disabled-color);
        font-style: italic;
        opacity: 1;
    }
</style>
