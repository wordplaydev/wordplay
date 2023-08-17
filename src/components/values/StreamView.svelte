<svelte:options immutable={true} />

<script lang="ts">
    import Sym from '@nodes/Sym';
    import type StreamValue from '@values/StreamValue';
    import { locales } from '../../db/Database';
    import SymbolView from './SymbolView.svelte';

    export let value: StreamValue;
    export let inline = true;
</script>

{#if inline || !inline}<SymbolView
        symbol={value.getPreferredName($locales)}
        type={Sym.Name}
    />{/if}
