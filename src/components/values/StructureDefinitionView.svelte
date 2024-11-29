<script lang="ts">
    import type StructureDefinitionValue from '@values/StructureDefinitionValue';
    import SymbolView from './SymbolView.svelte';
    import { TYPE_SYMBOL } from '@parser/Symbols';
    import Sym from '@nodes/Sym';
    import { locales } from '../../db/Database';

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
