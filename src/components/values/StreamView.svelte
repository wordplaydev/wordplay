<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '@nodes/TokenType';
    import type Stream from '@runtime/Stream';
    import { preferredLanguages } from '@locale/locales';
    import SymbolView from './SymbolView.svelte';

    export let value: Stream;
</script>

<SymbolView symbol={value.getName($preferredLanguages)} type={TokenType.Name} />
