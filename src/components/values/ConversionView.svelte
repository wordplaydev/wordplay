<script lang="ts">
    import Sym from '@nodes/Sym';
    import { CONVERT_SYMBOL } from '@parser/Symbols';
    import type ConversionDefinitionValue from '@values/ConversionDefinitionValue';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: ConversionDefinitionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
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
