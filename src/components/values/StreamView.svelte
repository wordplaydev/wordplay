<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '@nodes/TokenType';
    import type Stream from '@runtime/Stream';
    import { creator } from '../../db/Creator';
    import SymbolView from './SymbolView.svelte';

    export let value: Stream;
</script>

<SymbolView
    symbol={value.getName($creator.getLanguages())}
    type={TokenType.Name}
/>
