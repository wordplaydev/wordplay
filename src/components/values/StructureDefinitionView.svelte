<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinitionValue from '@runtime/StructureDefinitionValue';
    import SymbolView from './SymbolView.svelte';
    import { TYPE_SYMBOL } from '@parser/Symbols';
    import TokenType from '@nodes/TokenType';
    import { creator } from '../../db/Creator';

    export let value: StructureDefinitionValue;
</script>

<SymbolView symbol={TYPE_SYMBOL} type={TokenType.Type} /><SymbolView
    symbol={value.definition.names.getLocaleText($creator.getLanguages())}
    type={TokenType.Name}
/>
