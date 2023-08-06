<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinitionValue from '@values/StructureDefinitionValue';
    import SymbolView from './SymbolView.svelte';
    import { TYPE_SYMBOL } from '@parser/Symbols';
    import Symbol from '@nodes/Symbol';
    import { config } from '../../db/Database';

    export let value: StructureDefinitionValue;
    export let inline: boolean = true;
</script>

{#if inline || !inline}<SymbolView
        symbol={TYPE_SYMBOL}
        type={Symbol.Type}
    /><SymbolView
        symbol={value.definition.names.getPreferredNameString(
            $config.getLocales()
        )}
        type={Symbol.Name}
    />{/if}
