<svelte:options immutable={true} />

<script lang="ts">
    import SymbolView from './SymbolView.svelte';
    import Symbol from '@nodes/Symbol';
    import type StreamDefinitionValue from '../../values/StreamDefinitionValue';
    import { STREAM_SYMBOL } from '../../parser/Symbols';
    import { config } from '../../db/Creator';

    export let value: StreamDefinitionValue;
</script>

<SymbolView symbol={STREAM_SYMBOL} type={Symbol.Stream} />
<SymbolView
    symbol={value.definition.names.getPreferredNameString($config.getLocales())}
    type={Symbol.Name}
/>
