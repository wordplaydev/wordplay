<svelte:options immutable={true} />

<script lang="ts">
    import SymbolView from './SymbolView.svelte';
    import TokenType from '@nodes/TokenType';
    import { preferredLanguages } from '@translation/translations';
    import type StreamDefinitionValue from '../../runtime/StreamDefinitionValue';
    import { STREAM_SYMBOL } from '../../parser/Symbols';

    export let value: StreamDefinitionValue;
</script>

<SymbolView symbol={STREAM_SYMBOL} type={TokenType.STREAM} />
<SymbolView
    symbol={value.definition.names.getTranslation($preferredLanguages)}
    type={TokenType.NAME}
/>
