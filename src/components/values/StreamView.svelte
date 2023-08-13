<svelte:options immutable={true} />

<script lang="ts">
    import Sym from '@nodes/Symbol';
    import type StreamValue from '@values/StreamValue';
    import { config } from '../../db/Database';
    import SymbolView from './SymbolView.svelte';

    export let value: StreamValue;
    export let inline = true;
</script>

{#if inline || !inline}<SymbolView
        symbol={value.getPreferredName($config.getLocales())}
        type={Sym.Name}
    />{/if}
