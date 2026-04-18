<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        on: boolean | undefined;
        label: LocaleTextAccessor;
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

    let labelText = $derived($locales.getPlainText(label));

    function handleInput() {
        if (changed) changed(on);
    }
</script>

<input
    type="checkbox"
    aria-label={labelText}
    title={labelText}
    {id}
    disabled={!editable}
    bind:checked={on}
    indeterminate={on === undefined}
    onchange={handleInput}
/>

<style>
    [type='checkbox'] {
        appearance: none;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        width: 1rem;
        height: 1rem;
        min-width: 1rem;
        min-height: 1rem;
        cursor: pointer;
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transition:
            transform calc(var(--animation-factor) * 100ms),
            box-shadow calc(var(--animation-factor) * 100ms);
    }

    [type='checkbox']:hover {
        transform: translate(-1px, -1px);
    }

    [type='checkbox']:focus {
        outline: none;
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-focus-color);
    }

    [type='checkbox']:checked {
        background: var(--wordplay-foreground);
        box-shadow: 0 0 0 var(--wordplay-border-color);
        transform: translate(
            var(--wordplay-border-width),
            var(--wordplay-border-width)
        );
    }

    input:indeterminate {
        transform: rotate(45deg);
    }
</style>
