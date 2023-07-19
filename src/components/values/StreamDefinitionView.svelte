<svelte:options immutable={true} />

<script lang="ts">
    import SymbolView from './SymbolView.svelte';
    import Symbol from '@nodes/Symbol';
    import type StreamDefinitionValue from '../../runtime/StreamDefinitionValue';
    import { STREAM_SYMBOL } from '../../parser/Symbols';
    import { creator } from '../../db/Creator';

    export let value: StreamDefinitionValue;
</script>

<SymbolView symbol={STREAM_SYMBOL} type={Symbol.Stream} />
<SymbolView
    symbol={value.definition.names.getLocaleText($creator.getLanguages())}
    type={Symbol.Name}
/>
