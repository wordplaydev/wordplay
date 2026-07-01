<script lang="ts">
    import { Sym } from '@nodes/Sym';
    import type NumberValue from '@values/NumberValue';
    import SymbolView from '@components/values/SymbolView.svelte';
    import { locales } from '@db/Database';

    interface Props {
        value: NumberValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    // Render evaluated numbers localized (#1196): native digits, grouping, and
    // the locale's decimal separator for the active locale. Value views are
    // display-only (never inserted as source), so this doesn't affect the
    // Arabic-Western source/round-trip text produced by toWordplay().
    let text = $derived(value.toText($locales.getLocale()));
</script>

{#if inline || !inline}
    <SymbolView symbol={text} type={Sym.Number} />
{/if}
