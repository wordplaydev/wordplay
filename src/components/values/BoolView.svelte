<script lang="ts">
    import Sym from '@nodes/Sym';
    import type BoolValue from '@values/BoolValue';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: BoolValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}
    <SymbolView symbol={value.toWordplay()} type={Sym.Boolean} />
{/if}
