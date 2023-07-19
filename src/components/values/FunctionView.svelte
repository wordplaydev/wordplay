<svelte:options immutable={true} />

<script lang="ts">
    import type FunctionValue from '@runtime/FunctionValue';
    import SymbolView from './SymbolView.svelte';
    import { FUNCTION_SYMBOL } from '@parser/Symbols';
    import Symbol from '@nodes/Symbol';
    import { creator } from '../../db/Creator';

    export let value: FunctionValue;
</script>

<SymbolView symbol={FUNCTION_SYMBOL} type={Symbol.Function} />
<SymbolView
    symbol={value.definition.names.getLocaleText($creator.getLanguages())}
    type={Symbol.Name}
/>
