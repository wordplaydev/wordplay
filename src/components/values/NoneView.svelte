<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type None from '@runtime/None';
    import SymbolView from './SymbolView.svelte';

    export let value: None;
</script>

<SymbolView symbol={value.toWordplay()} type={Symbol.None} />
