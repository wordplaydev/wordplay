<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinitionValue from '@values/StructureDefinitionValue';
    import SymbolView from './SymbolView.svelte';
    import { TYPE_SYMBOL } from '@parser/Symbols';
    import Sym from '@nodes/Sym';
    import { locales } from '../../db/Database';

    export let value: StructureDefinitionValue;
    export let inline = true;
</script>

{#if inline || !inline}<SymbolView
        symbol={TYPE_SYMBOL}
        type={Sym.Type}
    /><SymbolView
        symbol={$locales.getName(value.definition.names)}
        type={Sym.Name}
    />{/if}
