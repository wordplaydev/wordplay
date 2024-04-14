<script lang="ts">
    export let on: boolean | undefined;
    export let label: string;
    export let changed: undefined | ((value: boolean | undefined) => void) =
        undefined;
    export let editable = true;
    /** Mandatory id for label */
    export let id: string | null;

    function handleInput() {
        if (changed) changed(on);
    }
</script>

<input
    type="checkbox"
    aria-label={label}
    title={label}
    {id}
    disabled={!editable}
    bind:checked={on}
    indeterminate={on === undefined}
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

    [type='checkbox']:checked {
        background: var(--wordplay-foreground);
    }

    input:indeterminate {
        transform: rotate(45deg);
    }
</style>
