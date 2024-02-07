<svelte:options immutable={true} />

<script lang="ts">
    import type MapValue from '@values/MapValue';
    import SymbolView from './SymbolView.svelte';
    import {
        BIND_SYMBOL,
        SET_CLOSE_SYMBOL,
        SET_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import Sym from '@nodes/Sym';
    import ValueView from './ValueView.svelte';
    import Expandable from './Expandable.svelte';

    export let value: MapValue;
    export let inline = true;

    const CollapsedLimit = 3;
    const MaxItems = 100;
</script>

<!-- Inline maps show a certain number key/value pairs before eliding. -->
{#if inline}
    <SymbolView symbol={SET_OPEN_SYMBOL} type={Sym.SetOpen} /><Expandable
        ><svelte:fragment slot="expanded"
            >{#each value.values as [key, val], index}<ValueView
                    value={key}
                    {inline}
                /><SymbolView symbol={BIND_SYMBOL} type={Sym.Bind} /><ValueView
                    value={val}
                    {inline}
                />{#if index < value.values.length - 1}{' '}{/if}{/each}</svelte:fragment
        ><svelte:fragment slot="collapsed"
            >{#each value.values.slice(0, CollapsedLimit) as [key, val], index}<ValueView
                    value={key}
                    {inline}
                /><SymbolView symbol={BIND_SYMBOL} type={Sym.Bind} /><ValueView
                    value={val}
                    {inline}
                />{#if index < value.values.length - 1}{' '}{/if}{/each}{#if value.values.length > 3}…{/if}</svelte:fragment
        ></Expandable
    ><SymbolView symbol={SET_CLOSE_SYMBOL} type={Sym.SetClose} />
{:else}
    <!-- Block maps are displayed as a two column table -->
    <table>
        {#each value.values.slice(0, MaxItems) as [key, val]}<tr
                ><td><ValueView value={key} {inline} /></td><td>
                    <ValueView value={val} {inline} /></td
                ></tr
            >{/each}
        {#if value.values.length > MaxItems}<tr><td colspan="2">…</td></tr>{/if}
    </table>
{/if}
