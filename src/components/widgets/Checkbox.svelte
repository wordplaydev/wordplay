<script lang="ts">
    import { locales } from '@db/Database';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { getFirstText } from '@locale/LocaleText';

    interface Props {
        on: boolean | undefined;
        label: LocaleTextAccessor | LocaleTextsAccessor;
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

    let labelText = $derived(getFirstText($locales.get(label)));

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
