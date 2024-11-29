<script lang="ts">
    import Sym from '@nodes/Sym';
    import {
        BIND_SYMBOL,
        EVAL_CLOSE_SYMBOL,
        EVAL_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import type StructureValue from '@values/StructureValue';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import { toColor } from '../../output/Color';
    import Expandable from './Expandable.svelte';
    import { locales } from '../../db/Database';
    import Names from '@nodes/Names';

    interface Props {
        value: StructureValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

<!-- Inline structures show the name and binds -->
{#if inline}
    <SymbolView
        symbol={$locales.getName(value.type.names)}
        type={Sym.Name}
    /><SymbolView symbol={EVAL_OPEN_SYMBOL} type={Sym.EvalOpen} /><Expandable
        >{#snippet expanded()}
            {#each [...value.context.getBindingsByNames()] as [name, val], index}<SymbolView
                    symbol={$locales.getName(name)}
                    type={Sym.Name}
                /><SymbolView symbol={BIND_SYMBOL} type={Sym.Bind} /><ValueView
                    value={val}
                    {inline}
                />{#if index < value.type.inputs.length - 1}{' '}{/if}{/each}{/snippet}
            {#snippet collapsed()}
                {#if value.is(value.context.getEvaluator().project.shares.output.Color)}<span
                    class="color"
                    style:background-color={toColor(value)?.toCSS()}
                    >&ZeroWidthSpace;</span
                >{:else}…{/if}{/snippet}</Expandable
    ><SymbolView symbol={EVAL_CLOSE_SYMBOL} type={Sym.EvalClose} />

    <!-- Block structures are HTML tables -->
{:else}
    {@const color = value.is(
        value.context.getEvaluator().project.shares.output.Color,
    )}
    <table>
        <tbody>
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
            {#each [...value.context.getBindingsByNames()] as [name, val]}<tr
                    ><td
                        ><SymbolView
                            symbol={name instanceof Names
                                ? $locales.getName(name)
                                : name}
                            type={Sym.Name}
                        /></td
                    ><td><ValueView value={val} {inline} /></td></tr
                >{/each}
        </tbody>
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
