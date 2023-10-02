<script lang="ts">
    export let on: boolean | undefined;
    export let changed: undefined | ((value: boolean | undefined) => void) =
        undefined;
    export let editable = true;

    function handleInput() {
        if (changed) changed(on);
    }
</script>

<input
    type="checkbox"
    disabled={!editable}
    bind:checked={on}
    on:change={handleInput}
/>

<style>
    [type='checkbox'] {
        appearance: none;
        border: solid var(--wordplay-border-color) var(--wordplay-border-width);
        width: 1rem;
        height: 1rem;
        min-width: 1rem;
        min-height: 1rem;
        cursor: pointer;
    }

    input:focus {
        outline: none;
        border-color: var(--wordplay-highlight-color);
    }

    [type='checkbox']:checked {
        background: var(--wordplay-foreground);
    }
</style>
