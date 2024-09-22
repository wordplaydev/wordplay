<svelte:options immutable={true} />

<script lang="ts">
    import type UnparsableType from '@nodes/UnparsableType';
    import UnparsableView from './UnparsableView.svelte';

    export let node: UnparsableType;
</script>

<UnparsableView {node} />
