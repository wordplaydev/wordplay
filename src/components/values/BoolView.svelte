<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type Bool from '@runtime/Bool';
    import SymbolView from './SymbolView.svelte';

    export let value: Bool;
</script>

<SymbolView symbol={value.toWordplay()} type={Symbol.Boolean} />
