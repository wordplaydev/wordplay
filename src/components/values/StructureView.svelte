<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '@nodes/TokenType';
    import {
        BIND_SYMBOL,
        EVAL_CLOSE_SYMBOL,
        EVAL_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import None from '@runtime/None';
    import type Structure from '@runtime/Structure';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import { toColor } from '../../output/Color';
    import Expandable from './Expandable.svelte';
    import { creator } from '../../db/Creator';

    export let value: Structure;
</script>

<SymbolView
    symbol={value.type.names.getLocaleText($creator.getLanguages())}
    type={TokenType.Name}
/><SymbolView symbol={EVAL_OPEN_SYMBOL} type={TokenType.EvalOpen} /><Expandable
    ><svelte:fragment slot="expanded">
        {#each value.type.inputs as input, index}<SymbolView
                symbol={input.names.getLocaleText($creator.getLanguages())}
                type={TokenType.Name}
            /><SymbolView
                symbol={BIND_SYMBOL}
                type={TokenType.Bind}
            /><ValueView
                value={value.resolve(input.getNames()[0]) ??
                    new None(value.type)}
            />{#if index < value.type.inputs.length - 1}{' '}{/if}{/each}</svelte:fragment
    ><svelte:fragment slot="collapsed"
        >{#if value.is(value.context.getEvaluator().project.shares.output.color)}<span
                class="color"
                style:background-color={toColor(value)?.toCSS()}
                >&ZeroWidthSpace;</span
            >{:else}…{/if}</svelte:fragment
    ></Expandable
><SymbolView symbol={EVAL_CLOSE_SYMBOL} type={TokenType.EvalClose} />

<style>
    .color {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        vertical-align: middle;
    }
</style>
