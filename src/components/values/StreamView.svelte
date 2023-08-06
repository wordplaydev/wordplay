<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type StreamValue from '@values/StreamValue';
    import { config } from '../../db/Creator';
    import SymbolView from './SymbolView.svelte';

    export let value: StreamValue;
    export const inline: boolean = true;
</script>

<SymbolView
    symbol={value.getPreferredName($config.getLocales())}
    type={Symbol.Name}
/>
