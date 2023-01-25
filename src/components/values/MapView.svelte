<svelte:options immutable={true} />

<script lang="ts">
    import type Map from '@runtime/Map';
    import SymbolView from './SymbolView.svelte';
    import {
        BIND_SYMBOL,
        SET_CLOSE_SYMBOL,
        SET_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import TokenType from '@nodes/TokenType';
    import ValueView from './ValueView.svelte';

    export let value: Map;
</script>

<SymbolView
    symbol={SET_OPEN_SYMBOL}
    type={TokenType.SET_OPEN}
/>{#each value.values as [key, val], index}<ValueView value={key} /><SymbolView
        symbol={BIND_SYMBOL}
        type={TokenType.BIND}
    /><ValueView
        value={val}
    />{#if index < value.values.length - 1}{' '}{/if}{/each}<SymbolView
    symbol={SET_CLOSE_SYMBOL}
    type={TokenType.SET_CLOSE}
/>
