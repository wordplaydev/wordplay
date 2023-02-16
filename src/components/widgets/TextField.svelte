<script lang="ts">
    export let text: string = '';
    export let placeholder: string;
    export let validator: undefined | ((text: string) => boolean) = undefined;
    export let changed: undefined | ((text: string) => void) = undefined;

    function handleInput() {
        if (changed) changed(text);
    }
</script>

<input
    type="text"
    class:error={validator ? validator(text) === false : null}
    {placeholder}
    bind:value={text}
    on:keydown|stopPropagation
    on:input={handleInput}
/>

<style>
    input {
        width: 100%;
        height: 100%;
        background: none;
        font-size: var(--wordplay-font-size);
        font-family: var(--wordplay-app-font);
        border: none;
        padding-bottom: var(--wordplay-spacing);
        border-bottom: var(--wordplay-disabled-color) solid
            var(--wordplay-border-width);
    }

    input:focus {
        outline: none;
        border-bottom-color: var(--wordplay-highlight);
    }

    .error {
        border-color: var(--wordplay-error);
    }
</style>
