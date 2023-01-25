<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '@nodes/TokenType';
    import type Bool from '@runtime/Bool';
    import SymbolView from './SymbolView.svelte';

    export let value: Bool;
</script>

<SymbolView symbol={value.toWordplay()} type={TokenType.BOOLEAN} />
