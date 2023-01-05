<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '../nodes/TokenType';
    import type Stream from '../runtime/Stream';
    import SymbolView from './SymbolView.svelte';
    import { getLanguages } from '../translations/translations';

    export let value: Stream;
</script>

<SymbolView
    symbol={value.names.getTranslation(getLanguages())}
    type={TokenType.NAME}
/>
