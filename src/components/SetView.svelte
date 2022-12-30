<svelte:options immutable={true} />

<script lang="ts">
    import type Set from '../runtime/Set';
    import SymbolView from './SymbolView.svelte';
    import TokenType from '../nodes/TokenType';
    import ValueView from './ValueView.svelte';
    import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '../parser/Tokenizer';

    export let value: Set;
</script>

<SymbolView
    symbol={SET_OPEN_SYMBOL}
    type={TokenType.SET_OPEN}
/>{#each value.values as item, index}<ValueView
        value={item}
    />{#if index < value.values.length - 1}{' '}{/if}{/each}<SymbolView
    symbol={SET_CLOSE_SYMBOL}
    type={TokenType.SET_CLOSE}
/>
