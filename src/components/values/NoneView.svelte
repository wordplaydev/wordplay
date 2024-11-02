<script lang="ts">
    import Sym from '@nodes/Sym';
    import type NoneValue from '@values/NoneValue';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: NoneValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}<SymbolView
        symbol={value.toWordplay()}
        type={Sym.None}
    />{/if}
