<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '@nodes/TokenType';
    import type Number from '@runtime/Number';
    import SymbolView from './SymbolView.svelte';

    export let value: Number;
</script>

<SymbolView symbol={value.toWordplay()} type={TokenType.Number} />
