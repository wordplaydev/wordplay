<script lang="ts">
    import { Sym } from '@nodes/Sym';
    import {
        BIND_SYMBOL,
        SET_CLOSE_SYMBOL,
        SET_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import type MapValue from '@values/MapValue';
    import Expandable from '@components/values/Expandable.svelte';
    import { fitCount } from '@components/values/fit';
    import SymbolView from '@components/values/SymbolView.svelte';
    import ValueView from '@components/values/ValueView.svelte';

    interface Props {
        value: MapValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    let start = $derived(
        fitCount((i) => {
            const [key, val] = value.values[i];
            return key.toWordplay().length + val.toWordplay().length;
        }, value.values.length),
    );
</script>

<!-- Inline maps show a certain number of key/value pairs before eliding. -->
{#if inline}
    <SymbolView symbol={SET_OPEN_SYMBOL} type={Sym.SetOpen} /><Expandable
        count={value.values.length}
        {start}
        >{#snippet content(limit)}{#each value.values.slice(0, limit) as [key, val], index}<ValueView
                    value={key}
                    {inline}
                /><SymbolView
                    symbol={BIND_SYMBOL}
                    type={Sym.Bind}
                /><ValueView
                    value={val}
                    {inline}
                />{#if index < value.values.length - 1}{' '}{/if}{/each}{/snippet}</Expandable
    ><SymbolView symbol={SET_CLOSE_SYMBOL} type={Sym.SetClose} />
{:else}
    <!-- Block maps are displayed as a two column table -->
    <table>
        <tbody>
            <Expandable count={value.values.length} {start} layout="row" columns={2}
                >{#snippet content(limit)}{#each value.values.slice(0, limit) as [key, val]}<tr
                            ><td><ValueView value={key} {inline} /></td><td>
                                <ValueView value={val} {inline} /></td
                            ></tr
                        >{/each}{/snippet}</Expandable
            >
        </tbody>
    </table>
{/if}
