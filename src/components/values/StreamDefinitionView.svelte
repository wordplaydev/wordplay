<svelte:options immutable={true} />

<script lang="ts">
    import SymbolView from './SymbolView.svelte';
    import { STREAM_SYMBOL } from '@parser/Symbols';
    import TokenType from '@nodes/TokenType';
    import { preferredLanguages } from '@translation/translations';
    import type StreamDefinitionValue from '../../runtime/StreamDefinitionValue';

    export let value: StreamDefinitionValue;
</script>

<SymbolView symbol={STREAM_SYMBOL} type={TokenType.STREAM_TYPE} />
<SymbolView
    symbol={value.definition.names.getTranslation($preferredLanguages)}
    type={TokenType.NAME}
/>
