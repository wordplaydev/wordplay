<svelte:options immutable={true} />

<script lang="ts">
    import type SetValue from '@values/SetValue';
    import SymbolView from './SymbolView.svelte';
    import Sym from '@nodes/Sym';
    import ValueView from './ValueView.svelte';
    import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '@parser/Symbols';
    import Expandable from './Expandable.svelte';

    export let value: SetValue;
    export let inline = true;

    const CollapsedLimit = 3;
    const MaxItems = 100;
</script>

<!-- Inline sets are shown as a collapsed list -->
{#if inline}
    <SymbolView
        symbol={SET_OPEN_SYMBOL}
        type={Sym.SetOpen}
    />{#if value.values.length > CollapsedLimit}<Expandable
            ><svelte:fragment slot="expanded"
                >{#each value.values as item, index}<ValueView
                        value={item}
                        {inline}
                    />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
            ><svelte:fragment slot="collapsed"
                >{#each value.values.slice(0, CollapsedLimit) as item, index}<ValueView
                        value={item}
                        {inline}
                    />{#if index < value.values.length - 1}{' '}{/if}{/each}…</svelte:fragment
            ></Expandable
        >{:else}{#each value.values as item, index}<ValueView
                value={item}
                {inline}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{/if}<SymbolView
        symbol={SET_CLOSE_SYMBOL}
        type={Sym.SetClose}
    />
    <!-- Block sets are like inline, but not collapsed -->
{:else}
    <SymbolView symbol={SET_OPEN_SYMBOL} type={Sym.SetOpen} />
    {#each value.values.slice(0, MaxItems) as item, index}<ValueView
            value={item}
            {inline}
        />{#if index < value.values.length - 1}{' '}{/if}{/each}
    {#if value.values.length > MaxItems}…{/if}
    <SymbolView symbol={SET_CLOSE_SYMBOL} type={Sym.SetClose} />
{/if}
