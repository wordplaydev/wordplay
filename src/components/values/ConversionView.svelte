<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import { CONVERT_SYMBOL } from '@parser/Symbols';
    import type ConversionDefinitionValue from '@values/ConversionDefinitionValue';
    import SymbolView from './SymbolView.svelte';

    export let value: ConversionDefinitionValue;
    export let inline: boolean = true;
</script>

{#if inline || !inline}
    <SymbolView
        symbol={value.definition.input.toWordplay()}
        type={Symbol.Type}
    /><SymbolView symbol={CONVERT_SYMBOL} type={Symbol.Convert} /><SymbolView
        symbol={value.definition.output.toWordplay()}
        type={Symbol.Type}
    />
{/if}
