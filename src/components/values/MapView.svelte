<svelte:options immutable={true} />

<script lang="ts">
    import type Map from '@runtime/Map';
    import SymbolView from './SymbolView.svelte';
    import {
        BIND_SYMBOL,
        SET_CLOSE_SYMBOL,
        SET_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import Symbol from '@nodes/Symbol';
    import ValueView from './ValueView.svelte';
    import Expandable from './Expandable.svelte';

    export let value: Map;
</script>

<SymbolView symbol={SET_OPEN_SYMBOL} type={Symbol.SetOpen} /><Expandable
    ><svelte:fragment slot="expanded"
        >{#each value.values as [key, val], index}<ValueView
                value={key}
            /><SymbolView symbol={BIND_SYMBOL} type={Symbol.Bind} /><ValueView
                value={val}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
    ><svelte:fragment slot="collapsed"
        >{#each value.values.slice(0, 3) as [key, val], index}<ValueView
                value={key}
            /><SymbolView symbol={BIND_SYMBOL} type={Symbol.Bind} /><ValueView
                value={val}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{#if value.values.length > 3}…{/if}</svelte:fragment
    ></Expandable
><SymbolView symbol={SET_CLOSE_SYMBOL} type={Symbol.SetClose} />
