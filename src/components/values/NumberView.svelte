<svelte:options immutable={true} />

<script lang="ts">
    import Sym from '@nodes/Sym';
    import type NumberValue from '@values/NumberValue';
    import SymbolView from './SymbolView.svelte';

    export let value: NumberValue;
    export let inline = true;
</script>

{#if inline || !inline}
    <SymbolView symbol={value.toWordplay()} type={Sym.Number} />
{/if}
