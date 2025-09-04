<script lang="ts">
    import Sym from '@nodes/Sym';
    import type NumberValue from '@values/NumberValue';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: NumberValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}
    <SymbolView symbol={value.toWordplay()} type={Sym.Number} />
{/if}
