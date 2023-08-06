<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type BoolValue from '@values/BoolValue';
    import SymbolView from './SymbolView.svelte';

    export let value: BoolValue;
    export let inline: boolean = true;
</script>

<SymbolView symbol={value.toWordplay()} type={Symbol.Boolean} />
