<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinitionValue from '../runtime/StructureDefinitionValue';
    import { preferredLanguages } from '../translations/translations';
    import SymbolView from './SymbolView.svelte';
    import { TYPE_SYMBOL } from '../parser/Symbols';
    import TokenType from '../nodes/TokenType';

    export let value: StructureDefinitionValue;
</script>

<SymbolView symbol={TYPE_SYMBOL} type={TokenType.TYPE} /><SymbolView
    symbol={value.definition.names.getTranslation($preferredLanguages)}
    type={TokenType.NAME}
/>
