<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinitionValue from '@runtime/StructureDefinitionValue';
    import SymbolView from './SymbolView.svelte';
    import { TYPE_SYMBOL } from '@parser/Symbols';
    import Symbol from '@nodes/Symbol';
    import { config } from '../../db/Creator';

    export let value: StructureDefinitionValue;
</script>

<SymbolView symbol={TYPE_SYMBOL} type={Symbol.Type} /><SymbolView
    symbol={value.definition.names.getLocaleText($config.getLanguages())}
    type={Symbol.Name}
/>
