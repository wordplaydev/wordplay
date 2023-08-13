<svelte:options immutable={true} />

<script lang="ts">
    import Sym from '@nodes/Symbol';
    import type BoolValue from '@values/BoolValue';
    import SymbolView from './SymbolView.svelte';

    export let value: BoolValue;
    export let inline = true;
</script>

{#if inline || !inline}
    <SymbolView symbol={value.toWordplay()} type={Sym.Boolean} />
{/if}
