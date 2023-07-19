<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type Number from '@runtime/Number';
    import SymbolView from './SymbolView.svelte';

    export let value: Number;
</script>

<SymbolView symbol={value.toWordplay()} type={Symbol.Number} />
