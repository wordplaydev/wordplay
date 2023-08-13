<svelte:options immutable={true} />

<script lang="ts">
    import Sym from '@nodes/Symbol';
    import { CONVERT_SYMBOL } from '@parser/Symbols';
    import type ConversionDefinitionValue from '@values/ConversionDefinitionValue';
    import SymbolView from './SymbolView.svelte';

    export let value: ConversionDefinitionValue;
    export let inline = true;
</script>

{#if inline || !inline}
    <SymbolView
        symbol={value.definition.input.toWordplay()}
        type={Sym.Type}
    /><SymbolView symbol={CONVERT_SYMBOL} type={Sym.Convert} /><SymbolView
        symbol={value.definition.output.toWordplay()}
        type={Sym.Type}
    />
{/if}
