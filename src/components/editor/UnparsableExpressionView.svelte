<svelte:options immutable={true} />

<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import UnparsableView from './UnparsableView.svelte';

    export let node: UnparsableExpression;
</script>

<UnparsableView {node} />
