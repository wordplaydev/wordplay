<script lang="ts">
    import Sym from '@nodes/Sym';
    import { TYPE_SYMBOL } from '@parser/Symbols';
    import type StructureDefinitionValue from '@values/StructureDefinitionValue';
    import { locales } from '../../db/Database';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: StructureDefinitionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}<SymbolView
        symbol={TYPE_SYMBOL}
        type={Sym.Type}
    /><SymbolView
        symbol={$locales.getName(value.definition.names)}
        type={Sym.Name}
    />{/if}
