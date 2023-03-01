<script lang="ts">
    export let text: string = '';
    export let placeholder: string;
    export let validator: undefined | ((text: string) => boolean) = undefined;
    export let changed: undefined | ((text: string) => void) = undefined;
    export let done: undefined | (() => void) = undefined;
    export let fit: boolean = false;
    export let input: HTMLInputElement | undefined = undefined;
    export let border: boolean = true;
    export let right: boolean = false;

    function handleInput() {
        if (changed) changed(text);
    }
</script>

<input
    type="text"
    class:fit
    class:border
    class:right
    class:error={validator ? validator(text) === false : null}
    bind:this={input}
    {placeholder}
    bind:value={text}
    on:keydown|stopPropagation
    on:input={handleInput}
    on:blur={done}
/>

<style>
    input {
        width: 100%;
        height: 100%;
        background: none;
        font-size: inherit;
        font-family: inherit;
        color: inherit;
        border: none;
        outline: none;
    }

    input.border {
        border-bottom: var(--wordplay-disabled-color) solid
            var(--wordplay-border-width);
    }

    input.right {
        text-align: right;
    }

    input.fit {
        width: auto;
    }

    input:focus {
        border-bottom-color: var(--wordplay-highlight);
    }

    input.error {
        color: var(--wordplay-error);
    }
</style>
