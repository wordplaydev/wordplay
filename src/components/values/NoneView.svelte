<script lang="ts">
    import { Sym } from '#nodes/Sym.ts';
    import type NoneValue from '#values/NoneValue.ts';
    import SymbolView from '#components/values/SymbolView.svelte';

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
