<svelte:options immutable={true} />

<script lang="ts">
    import type ListValue from '@values/ListValue';
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import Sym from '@nodes/Sym';
    import Expandable from './Expandable.svelte';

    export let value: ListValue;
    export let inline = true;

    const CollapseLimit = 3;
    const MaxItems = 100;
</script>

<!-- 
    Inline lists only show a certain number of values before collapsing the rest.
    The show an interactive control to expand values. 
-->
{#if inline}
    <SymbolView
        symbol={LIST_OPEN_SYMBOL}
        type={Sym.ListOpen}
    />{#if value.values.length > CollapseLimit}<Expandable
            ><svelte:fragment slot="expanded"
                >{#each value.values as item, index}<ValueView
                        value={item}
                        {inline}
                    />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
            ><svelte:fragment slot="collapsed"
                >{#each value.values.slice(0, CollapseLimit) as item, index}<ValueView
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
    />{#each value.values.slice(0, MaxItems) as item}{' '}<ValueView
            value={item}
            {inline}
        />{/each}
    {#if value.values.length > MaxItems}…{/if}
    <SymbolView symbol={LIST_CLOSE_SYMBOL} type={Sym.ListClose} />
{/if}
