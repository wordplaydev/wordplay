<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type VariableType from '../../nodes/VariableType';

    export let node: VariableType;
</script>

<NodeView node={node.definition} />
