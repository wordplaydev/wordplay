<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type NumberValue from '@values/NumberValue';
    import SymbolView from './SymbolView.svelte';

    export let value: NumberValue;
    export let inline: boolean = true;
</script>

{#if inline || !inline}
    <SymbolView symbol={value.toWordplay()} type={Symbol.Number} />
{/if}
