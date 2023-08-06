<svelte:options immutable={true} />

<script lang="ts">
    import type SetValue from '@values/SetValue';
    import SymbolView from './SymbolView.svelte';
    import Symbol from '@nodes/Symbol';
    import ValueView from './ValueView.svelte';
    import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '@parser/Symbols';
    import Expandable from './Expandable.svelte';

    export let value: SetValue;
    export let inline: boolean = true;

    const Limit = 3;
</script>

<!-- Inline sets are shown as a collapsed list -->
{#if inline}
    <SymbolView
        symbol={SET_OPEN_SYMBOL}
        type={Symbol.SetOpen}
    />{#if value.values.length > Limit}<Expandable
            ><svelte:fragment slot="expanded"
                >{#each value.values as item, index}<ValueView
                        value={item}
                        {inline}
                    />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
            ><svelte:fragment slot="collapsed"
                >{#each value.values.slice(0, Limit) as item, index}<ValueView
                        value={item}
                        {inline}
                    />{#if index < value.values.length - 1}{' '}{/if}{/each}…</svelte:fragment
            ></Expandable
        >{:else}{#each value.values as item, index}<ValueView
                value={item}
                {inline}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{/if}<SymbolView
        symbol={SET_CLOSE_SYMBOL}
        type={Symbol.SetClose}
    />
    <!-- Block sets are like inline, but not collapsed -->
{:else}
    <SymbolView symbol={SET_OPEN_SYMBOL} type={Symbol.SetOpen} />
    {#each value.values as item, index}<ValueView
            value={item}
            {inline}
        />{#if index < value.values.length - 1}{' '}{/if}{/each}
    <SymbolView symbol={SET_CLOSE_SYMBOL} type={Symbol.SetClose} />
{/if}
