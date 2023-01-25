<svelte:options immutable={true} />

<script lang="ts">
    import type List from '@runtime/List';
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import TokenType from '@nodes/TokenType';
    import Expandable from './Expandable.svelte';

    export let value: List;
</script>

<SymbolView symbol={LIST_OPEN_SYMBOL} type={TokenType.LIST_OPEN} /><Expandable
    ><svelte:fragment slot="expanded"
        >{#each value.values as item, index}<ValueView
                value={item}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
    ><svelte:fragment slot="collapsed"
        >{#each value.values.slice(0, 3) as item, index}<ValueView
                value={item}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{#if value.values.length > 3}…{/if}</svelte:fragment
    ></Expandable
><SymbolView symbol={LIST_CLOSE_SYMBOL} type={TokenType.LIST_CLOSE} />
