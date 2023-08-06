<svelte:options immutable={true} />

<script lang="ts">
    import type ListValue from '@values/ListValue';
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import Symbol from '@nodes/Symbol';
    import Expandable from './Expandable.svelte';

    export let value: ListValue;

    const limit = 3;
</script>

<SymbolView
    symbol={LIST_OPEN_SYMBOL}
    type={Symbol.ListOpen}
/>{#if value.values.length > limit}<Expandable
        ><svelte:fragment slot="expanded"
            >{#each value.values as item, index}<ValueView
                    value={item}
                />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
        ><svelte:fragment slot="collapsed"
            >{#each value.values.slice(0, limit) as item, index}<ValueView
                    value={item}
                />{#if index < value.values.length - 1}{' '}{/if}{/each}…</svelte:fragment
        ></Expandable
    >{:else}{#each value.values as item, index}<ValueView
            value={item}
        />{#if index < value.values.length - 1}{' '}{/if}{/each}{/if}<SymbolView
    symbol={LIST_CLOSE_SYMBOL}
    type={Symbol.ListClose}
/>
