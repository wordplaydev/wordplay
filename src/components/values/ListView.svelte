<svelte:options immutable={true} />

<script lang="ts">
    import type ListValue from '@values/ListValue';
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import Sym from '@nodes/Symbol';
    import Expandable from './Expandable.svelte';

    export let value: ListValue;
    export let inline = true;

    const limit = 5;
</script>

<!-- 
    Inline lists only show a certain number of values before collapsing the rest.
    The show an interactive control to expand values. 
-->
{#if inline}
    <SymbolView
        symbol={LIST_OPEN_SYMBOL}
        type={Sym.ListOpen}
    />{#if value.values.length > limit}<Expandable
            ><svelte:fragment slot="expanded"
                >{#each value.values as item, index}<ValueView
                        value={item}
                        {inline}
                    />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
            ><svelte:fragment slot="collapsed"
                >{#each value.values.slice(0, limit) as item, index}<ValueView
                        value={item}
                        {inline}
                    />{#if index < value.values.length - 1}{' '}{/if}{/each}…</svelte:fragment
            ></Expandable
        >{:else}{#each value.values as item, index}<ValueView
                value={item}
                {inline}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{/if}<SymbolView
        symbol={LIST_CLOSE_SYMBOL}
        type={Sym.ListClose}
    />
    <!-- 
    Block lists are basically inline but without collapsing, as they are likely in a place that can tolerate many values.
 -->
{:else}
    <SymbolView
        symbol={LIST_OPEN_SYMBOL}
        type={Sym.ListOpen}
    />{#each value.values as item}{' '}<ValueView
            value={item}
            {inline}
        />{/each}
    <SymbolView symbol={LIST_CLOSE_SYMBOL} type={Sym.ListClose} />
{/if}
