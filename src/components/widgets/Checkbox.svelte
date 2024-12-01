<script lang="ts">
    interface Props {
        on: boolean | undefined;
        label: string;
        changed?: undefined | ((value: boolean | undefined) => void);
        editable?: boolean;
        /** Mandatory id for label */
        id: string | undefined;
    }

    let {
        on = $bindable(),
        label,
        changed = undefined,
        editable = true,
        id,
    }: Props = $props();

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
    onchange={handleInput}
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
