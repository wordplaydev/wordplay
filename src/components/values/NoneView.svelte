<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type NoneValue from '@values/NoneValue';
    import SymbolView from './SymbolView.svelte';

    export let value: NoneValue;
</script>

<SymbolView symbol={value.toWordplay()} type={Symbol.None} />
