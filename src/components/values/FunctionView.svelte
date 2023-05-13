<svelte:options immutable={true} />

<script lang="ts">
    import type FunctionValue from '@runtime/FunctionValue';
    import SymbolView from './SymbolView.svelte';
    import { FUNCTION_SYMBOL } from '@parser/Symbols';
    import TokenType from '@nodes/TokenType';
    import { creator } from '../../db/Creator';

    export let value: FunctionValue;
</script>

<SymbolView symbol={FUNCTION_SYMBOL} type={TokenType.Function} />
<SymbolView
    symbol={value.definition.names.getLocaleText($creator.getLanguages())}
    type={TokenType.Name}
/>
