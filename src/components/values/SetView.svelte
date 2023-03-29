<svelte:options immutable={true} />

<script lang="ts">
    import type Set from '@runtime/Set';
    import SymbolView from './SymbolView.svelte';
    import TokenType from '@nodes/TokenType';
    import ValueView from './ValueView.svelte';
    import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '@parser/Symbols';
    import Expandable from './Expandable.svelte';

    export let value: Set;
</script>

<SymbolView symbol={SET_OPEN_SYMBOL} type={TokenType.SetOpen} /><Expandable
    ><svelte:fragment slot="expanded"
        >{#each value.values as item, index}<ValueView
                value={item}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
    ><svelte:fragment slot="collapsed"
        >{#each value.values.slice(0, 3) as item, index}<ValueView
                value={item}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{#if value.values.length > 3}…{/if}</svelte:fragment
    ></Expandable
><SymbolView symbol={SET_CLOSE_SYMBOL} type={TokenType.SetClose} />
