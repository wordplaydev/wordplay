<svelte:options immutable={true} />

<script lang="ts">
    import Sym from '@nodes/Sym';
    import {
        BIND_SYMBOL,
        EVAL_CLOSE_SYMBOL,
        EVAL_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import NoneValue from '@values/NoneValue';
    import type StructureValue from '@values/StructureValue';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import { toColor } from '../../output/Color';
    import Expandable from './Expandable.svelte';
    import { locales } from '../../db/Database';

    export let value: StructureValue;
    export let inline = true;
</script>

<!-- Inline structures show the name and binds -->
{#if inline}
    <SymbolView
        symbol={$locales.getName(value.type.names)}
        type={Sym.Name}
    /><SymbolView symbol={EVAL_OPEN_SYMBOL} type={Sym.EvalOpen} /><Expandable
        ><svelte:fragment slot="expanded">
            {#each value.type.inputs as input, index}<SymbolView
                    symbol={$locales.getName(input.names)}
                    type={Sym.Name}
                /><SymbolView symbol={BIND_SYMBOL} type={Sym.Bind} /><ValueView
                    value={value.resolve(input.getNames()[0]) ??
                        new NoneValue(value.type)}
                    {inline}
                />{#if index < value.type.inputs.length - 1}{' '}{/if}{/each}</svelte:fragment
        ><svelte:fragment slot="collapsed"
            >{#if value.is(value.context.getEvaluator().project.shares.output.Color)}<span
                    class="color"
                    style:background-color={toColor(value)?.toCSS()}
                    >&ZeroWidthSpace;</span
                >{:else}…{/if}</svelte:fragment
        ></Expandable
    ><SymbolView symbol={EVAL_CLOSE_SYMBOL} type={Sym.EvalClose} />

    <!-- Block structures are HTML tables -->
{:else}
    {@const color = value.is(
        value.context.getEvaluator().project.shares.output.Color
    )}
    <table>
        <tr
            ><th colspan={color ? 1 : 2}
                ><SymbolView
                    symbol={$locales.getName(value.type.names)}
                    type={Sym.Name}
                /></th
            >{#if color}
                <th
                    ><span
                        class="color"
                        style:background-color={toColor(value)?.toCSS()}
                        >&ZeroWidthSpace;</span
                    ></th
                >{/if}</tr
        >
        {#each value.type.inputs as input}<tr
                ><td
                    ><SymbolView
                        symbol={$locales.getName(input.names)}
                        type={Sym.Name}
                    /></td
                ><td
                    ><ValueView
                        value={value.resolve(input.getNames()[0]) ??
                            new NoneValue(value.type)}
                        {inline}
                    /></td
                ></tr
            >{/each}
    </table>
{/if}

<style>
    .color {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        vertical-align: middle;
    }
</style>
